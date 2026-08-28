import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { TripStatus } from "@prisma/client";

/**
 * GET /api/dashboard/stats
 * Aggregates CRM statistics:
 * 1. Revenue grouped strictly by currency (never summed across currencies per PRD Part 2 / Part 8)
 * 2. Lead counts by status
 * 3. Follow-up counts (Today, Overdue/Yesterday, Next 7 Days)
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get("dateRange") || "month"; // "today" | "week" | "month"

    const now = new Date();
    let startDate = new Date();

    if (dateRange === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRange === "week") {
      startDate.setDate(now.getDate() - 7);
    } else {
      // Month
      startDate.setDate(now.getDate() - 30);
    }

    // Role scoping: SALES_PERSON sees own leads, ADMIN/SALES_HEAD sees org-wide
    const tripFilter: any = {
      organization_id: user.organization_id,
      created_at: { gte: startDate },
    };

    if (user.role === "SALES_PERSON") {
      tripFilter.assigned_user_id = user.id;
    }

    // 1. Revenue grouped by currency for CONVERTED / COMPLETED trips
    const revenueByCurrency = await scopedPrisma.trip.groupBy({
      by: ["currency"],
      where: {
        ...tripFilter,
        status: { in: ["CONVERTED", "COMPLETED"] },
        package_amount: { not: null },
      },
      _sum: {
        package_amount: true,
      },
      _count: {
        id: true,
      },
    });

    // 2. Lead counts by status
    const allTripsCount = await scopedPrisma.trip.count({
      where: tripFilter,
    });

    const statusCounts = await scopedPrisma.trip.groupBy({
      by: ["status"],
      where: tripFilter,
      _count: {
        id: true,
      },
    });

    const statusMap: Record<string, number> = {};
    for (const item of statusCounts) {
      statusMap[item.status] = item._count.id;
    }

    // 3. Follow-up counts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const next7DaysEnd = new Date();
    next7DaysEnd.setDate(now.getDate() + 7);
    next7DaysEnd.setHours(23, 59, 59, 999);

    const followUpFilter: any = {
      trip: {
        organization_id: user.organization_id,
      },
      status: "PENDING",
    };

    if (user.role === "SALES_PERSON") {
      followUpFilter.assigned_to_user_id = user.id;
    }

    const [todayFollowUps, overdueFollowUps, upcomingFollowUps] = await Promise.all([
      scopedPrisma.followUp.count({
        where: {
          ...followUpFilter,
          due_date: { gte: todayStart, lte: todayEnd },
        },
      }),
      scopedPrisma.followUp.count({
        where: {
          ...followUpFilter,
          due_date: { lt: todayStart },
        },
      }),
      scopedPrisma.followUp.count({
        where: {
          ...followUpFilter,
          due_date: { gt: todayEnd, lte: next7DaysEnd },
        },
      }),
    ]);

    // Format revenue data
    const formattedRevenue = revenueByCurrency.map((item) => ({
      currency: item.currency || "USD",
      amount: item._sum.package_amount ? Number(item._sum.package_amount) : 0,
      bookingsCount: item._count.id,
    }));

    return NextResponse.json({
      revenue: formattedRevenue,
      totalLeads: allTripsCount,
      newQueries: statusMap["NEW_QUERY"] || 0,
      inProgress: statusMap["IN_PROGRESS"] || 0,
      onHold: statusMap["ON_HOLD"] || 0,
      converted: (statusMap["CONVERTED"] || 0) + (statusMap["COMPLETED"] || 0),
      cancelled: statusMap["CANCELLED"] || 0,
      dropped: statusMap["DROPPED"] || 0,
      followUps: {
        today: todayFollowUps,
        overdue: overdueFollowUps,
        next7Days: upcomingFollowUps,
      },
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
