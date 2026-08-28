import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { z } from "zod";

const querySchema = z.object({
  start_date: z.string().min(1, "start_date is required"),
  end_date: z.string().min(1, "end_date is required"),
});

/**
 * GET /api/operations/calendar/hotel-checkins?start_date=2026-09-01&end_date=2026-09-30
 * Bounded server-side query returning hotel check-ins and check-outs across the date range.
 * Groups bookings by Hotel (Y-axis) with daily occupancy blocks (X-axis).
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      start_date: searchParams.get("start_date"),
      end_date: searchParams.get("end_date"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "start_date and end_date query parameters are strictly required." },
        { status: 400 }
      );
    }

    const startDate = new Date(parsed.data.start_date);
    const endDate = new Date(parsed.data.end_date);

    // 1. Fetch active hotels
    const hotels = await scopedPrisma.hotel.findMany({
      where: {
        organization_id: user.organization_id,
        is_archived: false,
      },
      select: {
        id: true,
        name: true,
        star_rating: true,
        destination: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    // 2. Fetch service bookings with check-in or check-out overlapping range
    const bookings = await scopedPrisma.serviceBooking.findMany({
      where: {
        organization_id: user.organization_id,
        status: { notIn: ["CHANGED", "DROPPED", "CANCELLED"] },
        OR: [
          {
            check_in_date: { lte: endDate },
            check_out_date: { gte: startDate },
          },
          {
            service_date: { gte: startDate, lte: endDate },
          },
        ],
      },
      include: {
        trip: {
          select: {
            id: true,
            trip_display_id: true,
            guest: { select: { full_name: true, phone_number: true } },
          },
        },
        hotel: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    // 3. Format into a high-speed matrix for the frontend
    const hotelGrid = hotels.map((h: any) => {
      const hotelBookings = bookings.filter(
        (b: any) => b.hotel_id === h.id || b.service_name.toLowerCase().includes(h.name.toLowerCase())
      );

      return {
        hotel_id: h.id,
        hotel_name: h.name,
        destination_name: h.destination?.name || "General",
        star_rating: h.star_rating,
        bookings: hotelBookings.map((b: any) => ({
          id: b.id,
          trip_display_id: b.trip.trip_display_id,
          guest_name: b.trip.guest?.full_name || "Guest",
          guest_phone: b.trip.guest?.phone_number || "",
          check_in_date: b.check_in_date || b.service_date,
          check_out_date: b.check_out_date || b.service_date,
          room_count: b.room_count,
          pax_count: b.pax_count,
          meal_plan: b.meal_plan,
          status: b.status,
          is_self_booked: b.is_self_booked,
          supplier_confirmation_number: b.supplier_confirmation_number,
        })),
      };
    });

    return NextResponse.json({
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      hotels_count: hotels.length,
      bookings_count: bookings.length,
      grid: hotelGrid,
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
    ],
  }
);
