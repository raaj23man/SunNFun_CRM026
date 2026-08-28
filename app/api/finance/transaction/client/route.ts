import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { PaymentMode } from "@prisma/client";
import { logClientPaymentTransaction } from "@/lib/finance-service";

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
