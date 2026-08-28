import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { ServiceBookingStatus, QuoteItemType } from "@prisma/client";

const createServiceBookingSchema = z.object({
  trip_id: z.string().min(1, "Trip ID is required"),
  quote_item_id: z.string().nullable().optional(),
  supplier_id: z.string().nullable().optional(),
  hotel_id: z.string().nullable().optional(),
  service_type: z.nativeEnum(QuoteItemType).default(QuoteItemType.HOTEL),
  service_name: z.string().min(1, "Service name is required"),
  service_date: z.string().min(1, "Service date is required"),
  check_in_date: z.string().nullable().optional(),
  check_out_date: z.string().nullable().optional(),
  room_count: z.number().int().min(1).default(1),
  pax_count: z.number().int().min(1).default(2),
  meal_plan: z.string().default("CP"),
  cost_price: z.number().nonnegative().default(0),
  selling_price: z.number().nonnegative().default(0),
  is_self_booked: z.boolean().default(false),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/service-bookings
 * Lists operational service bookings with filtering by trip_id, status, date range.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("trip_id");
    const status = searchParams.get("status") as ServiceBookingStatus | null;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const supplierId = searchParams.get("supplier_id");

    const where: any = {
      organization_id: user.organization_id,
    };

    if (tripId) where.trip_id = tripId;
    if (status && Object.values(ServiceBookingStatus).includes(status)) {
      where.status = status;
    }
    if (supplierId) where.supplier_id = supplierId;

    if (startDate && endDate) {
      where.service_date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const bookings = await scopedPrisma.serviceBooking.findMany({
      where,
      include: {
        trip: {
          select: {
            id: true,
            trip_display_id: true,
            guest: { select: { full_name: true, phone_number: true } },
          },
        },
        supplier: { select: { id: true, name: true, contact_number: true, email: true } },
        hotel: { select: { id: true, name: true, star_rating: true } },
        dispatch_assignment: true,
        vouchers: true,
        replaced_by: { select: { id: true, service_name: true, status: true } },
      },
      orderBy: { service_date: "asc" },
    });

    return NextResponse.json({
      bookings,
      count: bookings.length,
    });
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
      "DATA_OPERATOR",
    ],
  }
);

/**
 * POST /api/service-bookings
 * Creates an operational service booking linked to a Trip.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = createServiceBookingSchema.parse(body);

    const booking = await scopedPrisma.serviceBooking.create({
      data: {
        organization_id: user.organization_id,
        trip_id: validated.trip_id,
        quote_item_id: validated.quote_item_id || null,
        supplier_id: validated.supplier_id || null,
        hotel_id: validated.hotel_id || null,
        service_type: validated.service_type,
        service_name: validated.service_name,
        status: validated.is_self_booked
          ? ServiceBookingStatus.CONFIRMED
          : ServiceBookingStatus.PENDING_CONFIRMATION,
        cost_price: validated.cost_price,
        selling_price: validated.selling_price,
        is_self_booked: validated.is_self_booked,
        service_date: new Date(validated.service_date),
        check_in_date: validated.check_in_date ? new Date(validated.check_in_date) : null,
        check_out_date: validated.check_out_date ? new Date(validated.check_out_date) : null,
        room_count: validated.room_count,
        pax_count: validated.pax_count,
        meal_plan: validated.meal_plan,
        notes: validated.notes || null,
      },
      include: {
        trip: { select: { trip_display_id: true } },
        supplier: true,
      },
    });

    // Write audit log
    await writeAuditLog(scopedPrisma, {
      organization_id: user.organization_id,
      actor_user_id: user.id,
      entity_type: "ServiceBooking" as any,
      entity_id: booking.id,
      action: "CREATE",
      diff: { service_name: booking.service_name, status: booking.status },
    });

    return NextResponse.json(
      {
        success: true,
        booking,
        message: "Operational service booking created successfully.",
      },
      { status: 201 }
    );
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS", "RESERVATIONS"],
  }
);
