import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { ServiceBookingStatus, QuoteItemType } from "@prisma/client";

const changeServiceBookingSchema = z.object({
  new_service_name: z.string().min(1, "New service name is required"),
  new_service_type: z.nativeEnum(QuoteItemType).default(QuoteItemType.HOTEL),
  new_supplier_id: z.string().nullable().optional(),
  new_hotel_id: z.string().nullable().optional(),
  new_service_date: z.string().min(1, "New service date is required"),
  new_check_in_date: z.string().nullable().optional(),
  new_check_out_date: z.string().nullable().optional(),
  new_room_count: z.number().int().min(1).default(1),
  new_pax_count: z.number().int().min(1).default(2),
  new_meal_plan: z.string().default("CP"),
  new_cost_price: z.number().nonnegative().default(0),
  new_selling_price: z.number().nonnegative().default(0),
  change_reason: z.string().nullable().optional(),
});

/**
 * POST /api/service-bookings/[id]/change
 * Performs a non-overwriting "Change" operation per PRD Part 5 Technical Constraints:
 * 1. Creates a new replacement ServiceBooking.
 * 2. Marks the old ServiceBooking as CHANGED, chained via replaced_by_service_booking_id.
 * 3. Preserves original cost and booking history intact.
 */
export const POST = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const originalBookingId = (params?.id as string) || "";
    const body = await req.json();
    const validated = changeServiceBookingSchema.parse(body);

    const original = await scopedPrisma.serviceBooking.findUnique({
      where: { id: originalBookingId },
    });

    if (!original || original.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    if (original.status === ServiceBookingStatus.CHANGED || original.status === ServiceBookingStatus.DROPPED) {
      return NextResponse.json(
        { error: `Cannot change a booking that is already ${original.status}.` },
        { status: 400 }
      );
    }

    // Execute atomic change chain
    const [newBooking, updatedOriginal] = await scopedPrisma.$transaction(async (tx: any) => {
      // 1. Create the new replacement booking
      const created = await tx.serviceBooking.create({
        data: {
          organization_id: user.organization_id,
          trip_id: original.trip_id,
          quote_item_id: original.quote_item_id,
          supplier_id: validated.new_supplier_id || null,
          hotel_id: validated.new_hotel_id || null,
          service_type: validated.new_service_type,
          service_name: validated.new_service_name,
          status: ServiceBookingStatus.PENDING_CONFIRMATION,
          cost_price: validated.new_cost_price,
          selling_price: validated.new_selling_price,
          is_self_booked: original.is_self_booked,
          service_date: new Date(validated.new_service_date),
          check_in_date: validated.new_check_in_date ? new Date(validated.new_check_in_date) : null,
          check_out_date: validated.new_check_out_date ? new Date(validated.new_check_out_date) : null,
          room_count: validated.new_room_count,
          pax_count: validated.new_pax_count,
          meal_plan: validated.new_meal_plan,
          notes: validated.change_reason ? `Replaced ${original.service_name}: ${validated.change_reason}` : null,
        },
        include: { supplier: true, hotel: true },
      });

      // 2. Mark original booking as CHANGED and chain to new booking
      const updated = await tx.serviceBooking.update({
        where: { id: originalBookingId },
        data: {
          status: ServiceBookingStatus.CHANGED,
          replaced_by_service_booking_id: created.id,
        },
      });

      return [created, updated];
    });

    // Write audit log
    await writeAuditLog(scopedPrisma, {
      organization_id: user.organization_id,
      actor_user_id: user.id,
      entity_type: "ServiceBooking" as any,
      entity_id: originalBookingId,
      action: "STATUS_CHANGE",
      diff: {
        action: "SERVICE_CHANGE",
        old_service_booking_id: originalBookingId,
        new_service_booking_id: newBooking.id,
        reason: validated.change_reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service booking changed successfully. Historical audit trail preserved.",
      original_booking: updatedOriginal,
      new_booking: newBooking,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS", "RESERVATIONS"],
  }
);
