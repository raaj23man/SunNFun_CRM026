import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { PaymentMode } from "@prisma/client";
import { logClientPaymentTransaction } from "@/lib/finance-service";
import { emitNotifyEvent } from "@/lib/notify-service";

const logClientPaymentSchema = z.object({
  trip_id: z.string().min(1, "Trip ID is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  payment_mode: z.nativeEnum(PaymentMode).default(PaymentMode.BANK_TRANSFER),
  reference_number: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  transaction_date: z.string().optional(),
  next_due_date: z.string().nullable().optional(),
  account_id: z.string().nullable().optional(),
});

/**
 * POST /api/finance/transaction/client
 * Logs an incoming client collection inside a strict Prisma $transaction().
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = logClientPaymentSchema.parse(body);

    const result = await scopedPrisma.$transaction(async (tx: any) => {
      return await logClientPaymentTransaction(tx, {
        organization_id: user.organization_id,
        trip_id: validated.trip_id,
        amount: validated.amount,
        payment_mode: validated.payment_mode,
        reference_number: validated.reference_number || undefined,
        remarks: validated.remarks || undefined,
        logged_by_user_id: user.id,
        transaction_date: validated.transaction_date ? new Date(validated.transaction_date) : undefined,
        next_due_date: validated.next_due_date ? new Date(validated.next_due_date) : undefined,
        account_id: validated.account_id || undefined,
      });
    });

    // Emit PAYMENT_RECEIVED Notify trigger event
    try {
      await emitNotifyEvent({
        event: "PAYMENT_RECEIVED" as any,
        organization_id: user.organization_id,
        entity_type: "ClientLedger",
        entity_id: result.ledger.id,
        trip_id: validated.trip_id,
        context: {
          amount_paid: validated.amount,
          currency: result.transaction.currency,
          payment_mode: validated.payment_mode,
          reference_number: validated.reference_number || null,
          total_paid: Number(result.ledger.total_paid_amount),
          total_billed: Number(result.ledger.total_billed_amount),
          status: result.ledger.status,
        },
      });
    } catch (e) {
      console.warn("[Client Payment] Non-blocking notify emission error:", e);
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      ledger: result.ledger,
      message: `Payment of ${result.transaction.currency} ${result.transaction.amount} logged successfully. Status: ${result.ledger.status}`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "SALES_HEAD"],
  }
);
