import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { ServiceBookingStatus } from "@prisma/client";
import { triggerBookingStatusChange } from "@/lib/notify-service";

const updateServiceBookingSchema = z.object({
  supplier_id: z.string().nullable().optional(),
  hotel_id: z.string().nullable().optional(),
  supplier_confirmation_number: z.string().nullable().optional(),
  status: z.nativeEnum(ServiceBookingStatus).optional(),
  cost_price: z.number().nonnegative().optional(),
  selling_price: z.number().nonnegative().optional(),
  amount_paid: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional(),
  payment_due_date: z.string().nullable().optional(),
});

/**
 * GET /api/service-bookings/[id]
 */
export const GET = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const bookingId = (params?.id as string) || "";

    const booking = await scopedPrisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: {
        trip: {
          include: {
            guest: true,
            assigned_user: { select: { first_name: true, last_name: true, email: true } },
          },
        },
        supplier: true,
        hotel: true,
        dispatch_assignment: true,
        vouchers: true,
        replaced_by: true,
        replaces: true,
      },
    });

    if (!booking || booking.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    return NextResponse.json({ booking });
  },
  {
    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_HEAD",
      "SALES_PERSON",
      "OPERATIONS",
      "RESERVATIONS",
      "ACCOUNTANT",
    ],
  }
);

/**
 * PUT /api/service-bookings/[id]
 * Updates supplier, confirmation number, status, locked cost price.
 */
export const PUT = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const bookingId = (params?.id as string) || "";
    const body = await req.json();
    const validated = updateServiceBookingSchema.parse(body);

    const existing = await scopedPrisma.serviceBooking.findUnique({
      where: { id: bookingId },
    });

    if (!existing || existing.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    // Terminal statuses cannot be arbitrarily updated via basic PUT
    if (existing.status === ServiceBookingStatus.CHANGED || existing.status === ServiceBookingStatus.DROPPED) {
      return NextResponse.json(
        { error: `Cannot modify a ${existing.status} service booking directly. Use change/drop endpoints.` },
        { status: 400 }
      );
    }

    const updated = await scopedPrisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        ...(validated.supplier_id !== undefined && { supplier_id: validated.supplier_id }),
        ...(validated.hotel_id !== undefined && { hotel_id: validated.hotel_id }),
        ...(validated.supplier_confirmation_number !== undefined && {
          supplier_confirmation_number: validated.supplier_confirmation_number,
        }),
        ...(validated.status && { status: validated.status }),
        ...(validated.cost_price !== undefined && { cost_price: validated.cost_price }),
        ...(validated.selling_price !== undefined && { selling_price: validated.selling_price }),
        ...(validated.amount_paid !== undefined && { amount_paid: validated.amount_paid }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
        ...(validated.payment_due_date !== undefined && {
          payment_due_date: validated.payment_due_date ? new Date(validated.payment_due_date) : null,
        }),
      },
      include: { supplier: true, hotel: true },
    });

    await writeAuditLog(scopedPrisma, {
      organization_id: user.organization_id,
      actor_user_id: user.id,
      entity_type: "ServiceBooking" as any,
      entity_id: bookingId,
      action: "UPDATE",
      diff: { before: existing, after: updated },
    });

    // Emit Notify trigger event if status changed
    if (validated.status && validated.status !== existing.status) {
      await triggerBookingStatusChange(
        bookingId,
        updated.status,
        user.organization_id,
        existing.trip_id
      );
    }

    return NextResponse.json({
      success: true,
      booking: updated,
      message: "Service booking updated successfully",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS", "RESERVATIONS", "ACCOUNTANT"],
  }
);
