import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, startOfToday } from "date-fns";
import { NotifyTriggerEvent, LedgerPaymentStatus } from "@prisma/client";
import { emitNotifyTrigger } from "@/lib/notify-dispatcher";

/**
 * POST /api/notify/emit-due-reminders
 * Automated cron/n8n triggered worker endpoint:
 * Scans ClientLedgers with due dates approaching in the next 48 hours and emits PAYMENT_DUE_REMINDER triggers.
 */
export async function POST(req: NextRequest) {
  try {
    const today = startOfToday();
    const thresholdDate = addDays(today, 2);

    // Find ledgers with due dates within 48h that are still unpaid
    const dueLedgers = await prisma.clientLedger.findMany({
      where: {
        status: { in: [LedgerPaymentStatus.UNPAID, LedgerPaymentStatus.PARTIAL] },
        next_due_date: {
          gte: today,
          lte: thresholdDate,
        },
      },
      include: {
        trip: {
          include: {
            guest: true,
            assigned_user: true,
          },
        },
      },
    });

    const emittedEvents = [];

    for (const ledger of dueLedgers) {
      const remainingBalance = Math.max(
        0,
        Number(ledger.total_billed_amount) - Number(ledger.total_paid_amount)
      );

      const triggerResult = await emitNotifyTrigger({
        organization_id: ledger.organization_id,
        trigger_event: NotifyTriggerEvent.PAYMENT_DUE_REMINDER,
        entity_id: ledger.id,
        recipient_phone: ledger.trip?.guest?.phone_number || undefined,
        recipient_email: ledger.trip?.guest?.email || undefined,
        context: {
          trip_id: ledger.trip_id,
          trip_display_id: ledger.trip?.trip_display_id,
          guest_name: ledger.trip?.guest?.full_name,
          due_date: ledger.next_due_date?.toISOString(),
          remaining_balance: remainingBalance,
          currency: ledger.currency,
          payment_link: `https://checkout.paddle.com/pay?trip=${ledger.trip_id}`,
        },
      });

      emittedEvents.push({
        ledger_id: ledger.id,
        trip_display_id: ledger.trip?.trip_display_id,
        result: triggerResult,
      });
    }

    return NextResponse.json({
      success: true,
      scanned_count: dueLedgers.length,
      emitted_count: emittedEvents.length,
      events: emittedEvents,
    });
  } catch (error: any) {
    console.error("Error emitting payment due reminders:", error);
    return NextResponse.json({ error: error.message || "Failed to emit reminders" }, { status: 500 });
  }
}
