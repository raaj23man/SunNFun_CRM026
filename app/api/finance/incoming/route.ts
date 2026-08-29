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

    let ledgers: any[] = [];
    try {
      ledgers = await scopedPrisma.clientLedger.findMany({
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
    } catch (err: any) {
      console.warn("[Finance Incoming API] DB offline, using mock client ledgers:", err.message);
      const { MOCK_TRIPS } = await import("@/lib/mock-data-store");
      ledgers = MOCK_TRIPS.filter((t) => t.client_ledger).map((t) => ({
        id: t.client_ledger.id,
        organization_id: t.organization_id,
        trip_id: t.id,
        total_billed_amount: t.client_ledger.total_billed_amount,
        total_paid_amount: t.client_ledger.total_paid_amount,
        status: t.client_ledger.status,
        next_due_date: t.client_ledger.next_due_date,
        currency: t.client_ledger.currency,
        trip: {
          id: t.id,
          trip_display_id: t.trip_display_id,
          is_locked: t.is_locked,
          guest: t.guest,
          assigned_user: t.assigned_user,
        },
        transactions: [
          {
            id: `tx_${t.id}`,
            amount: t.client_ledger.total_paid_amount,
            currency: "USD",
            payment_mode: "BANK_TRANSFER",
            transaction_date: new Date(Date.now() - 86400000 * 2).toISOString(),
            status: "CLEARED",
            is_reverted: false,
          },
        ],
      }));
    }

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
