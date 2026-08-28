import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { z } from "zod";

const querySchema = z.object({
  start_date: z.string().min(1, "start_date is required"),
  end_date: z.string().min(1, "end_date is required"),
});

/**
 * GET /api/operations/calendar/trips?start_date=2026-09-01&end_date=2026-09-30
 * Bounded server-side query returning trips active within the range.
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

    // Active trips whose window overlaps with [startDate, endDate]
    const trips = await scopedPrisma.trip.findMany({
      where: {
        organization_id: user.organization_id,
        start_date: {
          lte: endDate,
          gte: new Date(startDate.getTime() - 45 * 86400000), // 45-day lookback window for ongoing tours
        },
      },
      include: {
        guest: { select: { full_name: true, phone_number: true } },
        destination: { select: { name: true } },
        assigned_user: { select: { first_name: true, last_name: true } },
        service_bookings: {
          where: {
            status: { notIn: ["CHANGED", "DROPPED", "CANCELLED"] },
          },
          select: {
            id: true,
            service_name: true,
            service_type: true,
            service_date: true,
            check_in_date: true,
            check_out_date: true,
            status: true,
            supplier_confirmation_number: true,
          },
        },
      },
      orderBy: { start_date: "asc" },
    });

    return NextResponse.json({
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      count: trips.length,
      trips,
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
