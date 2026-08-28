import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";

/**
 * GET /api/dashboard/live-trips
 * Retrieves trips currently on tour (start_date <= today <= start_date + duration_days).
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const today = new Date();

    // Fetch active converted/in-progress trips
    const candidateTrips = await scopedPrisma.trip.findMany({
      where: {
        organization_id: user.organization_id,
        status: { in: ["CONVERTED", "COMPLETED"] },
        start_date: { lte: today },
      },
      include: {
        guest: {
          select: { id: true, full_name: true, phone_number: true },
        },
        destination: {
          select: { id: true, name: true },
        },
        assigned_user: {
          select: { id: true, first_name: true, last_name: true },
        },
        tourists: true,
      },
      orderBy: { start_date: "desc" },
    });

    const liveTrips = candidateTrips
      .map((trip) => {
        const startDate = new Date(trip.start_date);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + trip.duration_days);

        const isCurrentlyLive = today >= startDate && today <= endDate;
        if (!isCurrentlyLive) return null;

        const diffTime = Math.abs(today.getTime() - startDate.getTime());
        const currentDay = Math.min(
          Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1,
          trip.duration_days
        );

        return {
          id: trip.id,
          trip_display_id: trip.trip_display_id,
          guest_name: trip.guest.full_name,
          guest_phone: trip.guest.phone_number,
          destination_name: trip.destination?.name || "Multiple Destinations",
          start_date: trip.start_date,
          duration_days: trip.duration_days,
          current_day: currentDay,
          total_pax: trip.pax_adults + trip.pax_children,
          assigned_agent: `${trip.assigned_user.first_name} ${trip.assigned_user.last_name}`,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      liveTrips,
      count: liveTrips.length,
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
