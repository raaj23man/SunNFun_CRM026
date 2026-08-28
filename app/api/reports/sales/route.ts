import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { TripStatus } from "@prisma/client";

/**
 * GET /api/reports/sales?groupBy=agent|destination|source&startDate=&endDate=
 * Returns comprehensive sales conversion statistics grouped by Agent, Destination, or Source.
 * Revenue is grouped by currency, never summed across distinct currencies.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const groupBy = searchParams.get("groupBy") || "agent";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {
      organization_id: user.organization_id,
    };

    if (startDate && endDate) {
      where.start_date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const trips = await scopedPrisma.trip.findMany({
      where,
      include: {
        assigned_user: { select: { id: true, first_name: true, last_name: true } },
        destination: { select: { id: true, name: true } },
        trip_source: { select: { id: true, name: true } },
        quotes: {
          where: { status: "ACCEPTED" },
          select: { id: true, total_selling_price: true, total_cost_price: true, currency: true },
        },
        client_ledger: {
          select: { total_billed_amount: true, total_paid_amount: true, currency: true },
        },
      },
    });

    // Aggregation Map
    const groupMap = new Map<string, any>();

    for (const trip of trips) {
      let key = "Unassigned";
      if (groupBy === "agent") {
        key = trip.assigned_user ? `${trip.assigned_user.first_name} ${trip.assigned_user.last_name}` : "Unassigned";
      } else if (groupBy === "destination") {
        key = trip.destination?.name || "General";
      } else if (groupBy === "source") {
        key = trip.trip_source?.name || "Direct";
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          name: key,
          total_leads: 0,
          total_quotes: 0,
          conversions: 0,
          dropped: 0,
          total_pax: 0,
          revenue_by_currency: {} as Record<string, number>,
        });
      }

      const row = groupMap.get(key);
      row.total_leads += 1;
      row.total_pax += (trip.pax_adults || 0) + (trip.pax_children || 0);

      if (trip.status === TripStatus.CONVERTED || trip.status === TripStatus.COMPLETED) {
        row.conversions += 1;
      }
      if (trip.status === TripStatus.DROPPED || trip.status === TripStatus.CANCELLED) {
        row.dropped += 1;
      }
      if (trip.quotes && trip.quotes.length > 0) {
        row.total_quotes += 1;
      }

      const curr = trip.currency || "USD";
      const amount = Number(trip.client_ledger?.total_billed_amount || trip.package_amount || 0);
      row.revenue_by_currency[curr] = (row.revenue_by_currency[curr] || 0) + amount;
    }

    const rows = Array.from(groupMap.values()).map((r) => ({
      ...r,
      conversion_rate_percent:
        r.total_leads > 0 ? Math.round((r.conversions / r.total_leads) * 1000) / 10 : 0,
    }));

    return NextResponse.json({
      group_by: groupBy,
      total_records: rows.length,
      rows,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "ACCOUNTANT"],
  }
);
