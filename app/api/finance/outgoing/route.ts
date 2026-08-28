import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { LedgerPaymentStatus } from "@prisma/client";
import { startOfToday, subDays, addDays } from "date-fns";

/**
 * GET /api/finance/outgoing?filter=past7|today|upcoming|overdue|paid
 * Lists supplier accounts payables sorted by due_date ASC.
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
      where.due_date = { lt: today };
    } else if (filter === "today") {
      where.due_date = {
        gte: today,
        lt: addDays(today, 1),
      };
    } else if (filter === "past7") {
      where.due_date = {
        gte: subDays(today, 7),
        lte: today,
      };
    } else if (filter === "upcoming") {
      where.due_date = {
        gt: today,
      };
    }

    const ledgers = await scopedPrisma.supplierLedger.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true, contact_number: true, email: true },
        },
        service_booking: {
          select: {
            id: true,
            service_name: true,
            service_date: true,
            status: true,
            supplier_confirmation_number: true,
          },
        },
        trip: {
          select: {
            id: true,
            trip_display_id: true,
            guest: { select: { full_name: true } },
          },
        },
        transactions: {
          orderBy: { transaction_date: "desc" },
        },
      },
      orderBy: { due_date: "asc" },
    });

    return NextResponse.json({
      filter,
      count: ledgers.length,
      ledgers,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "OPERATIONS", "RESERVATIONS"],
  }
);
