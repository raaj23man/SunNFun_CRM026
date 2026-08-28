import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { ServiceBookingStatus, QuoteItemType } from "@prisma/client";

const selfBookedSchema = z.object({
  trip_id: z.string().min(1, "Trip ID is required"),
  service_name: z.string().min(1, "Service / Hotel name is required"),
  service_type: z.nativeEnum(QuoteItemType).default(QuoteItemType.HOTEL),
  service_date: z.string().min(1, "Service date is required"),
  check_in_date: z.string().nullable().optional(),
  check_out_date: z.string().nullable().optional(),
  room_count: z.number().int().min(1).default(1),
  pax_count: z.number().int().min(1).default(2),
  meal_plan: z.string().default("CP"),
  supplier_confirmation_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * POST /api/service-bookings/self-booked
 * Records client/agency self-booked accommodations per PRD Part 5:
 * Tracked for itinerary completeness and vouchers, with 0 internal supplier cost.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = selfBookedSchema.parse(body);

    const booking = await scopedPrisma.serviceBooking.create({
      data: {
        organization_id: user.organization_id,
        trip_id: validated.trip_id,
        service_type: validated.service_type,
        service_name: validated.service_name,
        status: ServiceBookingStatus.CONFIRMED,
        cost_price: 0,
        selling_price: 0,
        is_self_booked: true,
        service_date: new Date(validated.service_date),
        check_in_date: validated.check_in_date ? new Date(validated.check_in_date) : null,
        check_out_date: validated.check_out_date ? new Date(validated.check_out_date) : null,
        room_count: validated.room_count,
        pax_count: validated.pax_count,
        meal_plan: validated.meal_plan,
        supplier_confirmation_number: validated.supplier_confirmation_number || "DIRECT_SELF_BOOKED",
        notes: validated.notes ? `[Self-Booked] ${validated.notes}` : "[Self-Booked by Client/Agency]",
      },
      include: {
        trip: { select: { trip_display_id: true } },
      },
    });

    // Write audit log
    await writeAuditLog(scopedPrisma, {
      organization_id: user.organization_id,
      actor_user_id: user.id,
      entity_type: "ServiceBooking" as any,
      entity_id: booking.id,
      action: "CREATE",
      diff: { action: "SELF_BOOKED_ENTRY", service_name: booking.service_name },
    });

    return NextResponse.json({
      success: true,
      booking,
      message: "Self-booked service recorded successfully.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS", "RESERVATIONS", "SALES_PERSON"],
  }
);
