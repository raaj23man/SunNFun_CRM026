import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { revertFinancialTransaction } from "@/lib/finance-service";

const revertSchema = z.object({
  reason: z.string().min(1, "Reason for reversal is required"),
});

/**
 * POST /api/finance/transaction/[id]/revert
 * Reverts a financial transaction atomically.
 * Strictly checks trip.is_locked on the backend and returns 403 Forbidden if locked.
 */
export const POST = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const transactionId = (params?.id as string) || "";
    const body = await req.json();
    const validated = revertSchema.parse(body);

    const reverted = await scopedPrisma.$transaction(async (tx: any) => {
      return await revertFinancialTransaction(tx, {
        organization_id: user.organization_id,
        transaction_id: transactionId,
        user_id: user.id,
        reason: validated.reason,
      });
    });

    return NextResponse.json({
      success: true,
      transaction: reverted,
      message: "Transaction successfully reverted and ledger balances adjusted.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  }
);
