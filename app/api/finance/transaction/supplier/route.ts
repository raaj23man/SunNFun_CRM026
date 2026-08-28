import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { PaymentMode } from "@prisma/client";
import { logSupplierPaymentTransaction } from "@/lib/finance-service";

const logSupplierPaymentSchema = z.object({
  service_booking_id: z.string().min(1, "Service booking ID is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  payment_mode: z.nativeEnum(PaymentMode).default(PaymentMode.BANK_TRANSFER),
  reference_number: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  transaction_date: z.string().optional(),
  account_id: z.string().nullable().optional(),
});

/**
 * POST /api/finance/transaction/supplier
 * Logs an outgoing supplier payout inside a strict Prisma $transaction().
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = logSupplierPaymentSchema.parse(body);

    const result = await scopedPrisma.$transaction(async (tx: any) => {
      return await logSupplierPaymentTransaction(tx, {
        organization_id: user.organization_id,
        service_booking_id: validated.service_booking_id,
        amount: validated.amount,
        payment_mode: validated.payment_mode,
        reference_number: validated.reference_number || undefined,
        remarks: validated.remarks || undefined,
        logged_by_user_id: user.id,
        transaction_date: validated.transaction_date ? new Date(validated.transaction_date) : undefined,
        account_id: validated.account_id || undefined,
      });
    });

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      ledger: result.ledger,
      message: `Supplier payout of ${result.transaction.currency} ${result.transaction.amount} logged successfully. Status: ${result.ledger.status}`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "OPERATIONS"],
  }
);
