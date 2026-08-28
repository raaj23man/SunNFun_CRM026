import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";

const dispatchSchema = z.object({
  driver_name: z.string().min(1, "Driver name is required"),
  driver_phone: z.string().min(1, "Driver phone is required"),
  cab_type: z.string().min(1, "Vehicle / Cab type is required"),
  vehicle_number: z.string().min(1, "Vehicle registration number is required"),
  pickup_time: z.string().nullable().optional(),
  pickup_location: z.string().nullable().optional(),
  drop_location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * POST /api/dispatch/[serviceBookingId]
 * Creates or updates driver and vehicle dispatch assignment.
 */
export const POST = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const serviceBookingId = (params?.serviceBookingId as string) || "";
    const body = await req.json();
    const validated = dispatchSchema.parse(body);

    const booking = await scopedPrisma.serviceBooking.findUnique({
      where: { id: serviceBookingId },
      include: { trip: true },
    });

    if (!booking || booking.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    const assignment = await scopedPrisma.dispatchAssignment.upsert({
      where: { service_booking_id: serviceBookingId },
      create: {
        service_booking_id: serviceBookingId,
        driver_name: validated.driver_name,
        driver_phone: validated.driver_phone,
        cab_type: validated.cab_type,
        vehicle_number: validated.vehicle_number,
        pickup_time: validated.pickup_time ? new Date(validated.pickup_time) : null,
        pickup_location: validated.pickup_location || null,
        drop_location: validated.drop_location || null,
        notes: validated.notes || null,
      },
      update: {
        driver_name: validated.driver_name,
        driver_phone: validated.driver_phone,
        cab_type: validated.cab_type,
        vehicle_number: validated.vehicle_number,
        pickup_time: validated.pickup_time ? new Date(validated.pickup_time) : null,
        pickup_location: validated.pickup_location || null,
        drop_location: validated.drop_location || null,
        notes: validated.notes || null,
      },
    });

    await writeAuditLog(scopedPrisma, {
      organization_id: user.organization_id,
      actor_user_id: user.id,
      entity_type: "TransportService" as any,
      entity_id: serviceBookingId,
      action: "UPDATE",
      diff: { action: "DISPATCH_ASSIGNMENT", driver_name: assignment.driver_name, vehicle: assignment.vehicle_number },
    });

    return NextResponse.json({
      success: true,
      assignment,
      message: "Dispatch assignment updated successfully.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS", "RESERVATIONS"],
  }
);
