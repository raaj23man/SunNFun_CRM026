import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { LedgerPaymentStatus } from "@prisma/client";
import { startOfToday, subDays, addDays } from "date-fns";

/**
 * GET /api/finance/incoming?filter=past7|today|upcoming|overdue|paid
 * Lists client receivables sorted by next_due_date ASC.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const today = startOfToday();

    const where: any = {
      organization_id: user.organization_id,
    };

    if (filter === "paid") {
      where.status = LedgerPaymentStatus.PAID_IN_FULL;
    } else if (filter === "overdue") {
      where.status = { in: [LedgerPaymentStatus.UNPAID, LedgerPaymentStatus.PARTIAL] };
      where.next_due_date = { lt: today };
    } else if (filter === "today") {
      where.next_due_date = {
        gte: today,
        lt: addDays(today, 1),
      };
    } else if (filter === "past7") {
      where.next_due_date = {
        gte: subDays(today, 7),
        lte: today,
      };
    } else if (filter === "upcoming") {
      where.next_due_date = {
        gt: today,
      };
    }

    const ledgers = await scopedPrisma.clientLedger.findMany({
      where,
      include: {
        trip: {
          select: {
            id: true,
            trip_display_id: true,
            is_locked: true,
            guest: { select: { full_name: true, phone_number: true, email: true } },
            assigned_user: { select: { first_name: true, last_name: true } },
          },
        },
        transactions: {
          orderBy: { transaction_date: "desc" },
        },
      },
      orderBy: { next_due_date: "asc" },
    });

    return NextResponse.json({
      filter,
      count: ledgers.length,
      ledgers,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "SALES_HEAD", "SALES_PERSON"],
  }
);
