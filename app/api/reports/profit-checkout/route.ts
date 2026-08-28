import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";

/**
 * GET /api/reports/profit-checkout?startDate=&endDate=
 * Computes exact Trip Profit = Quote Selling Price - SUM(ServiceBooking Cost Price).
 * STRICTLY SURFACES PENDING-BOOKINGS WARNING BANNER when bookings are pending confirmation.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
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
        guest: { select: { full_name: true } },
        destination: { select: { name: true } },
        assigned_user: { select: { first_name: true, last_name: true } },
        quotes: {
          orderBy: { version: "desc" },
          take: 1,
          include: {
            options: { where: { is_default: true } },
          },
        },
        service_bookings: {
          where: { status: { notIn: ["CHANGED", "DROPPED", "CANCELLED"] } },
          select: {
            id: true,
            service_name: true,
            cost_price: true,
            status: true,
          },
        },
      },
      orderBy: { start_date: "desc" },
    });

    let overallPendingCount = 0;

    const reportRows = trips.map((trip: any) => {
      const quote = trip.quotes?.[0];
      const sellingPrice = Number(trip.package_amount || quote?.total_selling_price || 0);

      const confirmedBookings = trip.service_bookings.filter(
        (b: any) => b.status === "CONFIRMED" || b.status === "VOUCHER_GENERATED"
      );
      const pendingBookings = trip.service_bookings.filter(
        (b: any) => b.status === "PENDING_CONFIRMATION" || b.status === "ENQUIRY_SENT"
      );

      const confirmedCost = confirmedBookings.reduce(
        (sum: number, b: any) => sum + Number(b.cost_price || 0),
        0
      );
      const estimatedTotalCost = trip.service_bookings.reduce(
        (sum: number, b: any) => sum + Number(b.cost_price || 0),
        0
      );

      const isPending = pendingBookings.length > 0;
      if (isPending) overallPendingCount += pendingBookings.length;

      const grossProfit = sellingPrice - estimatedTotalCost;
      const marginPercent =
        sellingPrice > 0 ? Math.round((grossProfit / sellingPrice) * 1000) / 10 : 0;

      return {
        trip_id: trip.id,
        trip_display_id: trip.trip_display_id,
        guest_name: trip.guest?.full_name || "Guest",
        destination: trip.destination?.name || "General",
        agent_name: trip.assigned_user ? `${trip.assigned_user.first_name} ${trip.assigned_user.last_name}` : "Unassigned",
        currency: trip.currency || "USD",
        selling_price: sellingPrice,
        confirmed_cost: confirmedCost,
        total_cost: estimatedTotalCost,
        gross_profit: grossProfit,
        margin_percent: marginPercent,
        has_pending_bookings: isPending,
        pending_count: pendingBookings.length,
        pending_warning: isPending
          ? `⚠️ Profit may change — ${pendingBookings.length} booking(s) pending confirmation`
          : null,
      };
    });

    return NextResponse.json({
      total_trips: reportRows.length,
      total_pending_bookings: overallPendingCount,
      has_unconfirmed_operations: overallPendingCount > 0,
      banner_warning:
        overallPendingCount > 0
          ? `⚠️ Notice: ${overallPendingCount} service booking(s) across these tours are currently pending supplier confirmation. Reported profits may fluctuate once suppliers confirm actual rates.`
          : null,
      rows: reportRows,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "SALES_HEAD"],
  }
);
