import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentGatewayStatus, PaymentMode } from "@prisma/client";
import { logClientPaymentTransaction } from "@/lib/finance-service";

/**
 * POST /api/webhooks/paddle
 * Webhook listener for Paddle payment events (e.g. transaction.completed).
 * Strictly idempotent by gateway_transaction_id: a replayed event never double-posts payments.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const eventType = payload.event_type || payload.type || "transaction.completed";
    const data = payload.data || payload;

    const gatewayTransactionId =
      data.id || data.transaction_id || data.gateway_transaction_id;

    if (!gatewayTransactionId) {
      return NextResponse.json({ error: "Missing gateway_transaction_id in payload" }, { status: 400 });
    }

    // 1. Fetch Gateway Record
    const existingGatewayTx = await prisma.paymentGatewayTransaction.findUnique({
      where: { gateway_transaction_id: gatewayTransactionId },
      include: {
        client_ledger: true,
        trip: true,
      },
    });

    if (!existingGatewayTx) {
      // Unrecognized transaction, return 200 to acknowledge webhook
      return NextResponse.json({ received: true, warning: "Transaction ID not found in system" }, { status: 200 });
    }

    // 2. IDEMPOTENCY GUARD: If already succeeded, return 200 without creating duplicate transaction
    if (existingGatewayTx.status === PaymentGatewayStatus.SUCCEEDED) {
      return NextResponse.json({
        received: true,
        idempotent_noop: true,
        message: "Webhook already processed. Duplicate event ignored.",
      });
    }

    const amountPaid = Number(data.amount || existingGatewayTx.amount || 0);

    // 3. Process payment atomically in Prisma $transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark gateway transaction as SUCCEEDED
      const updatedGatewayTx = await tx.paymentGatewayTransaction.update({
        where: { id: existingGatewayTx.id },
        data: {
          status: PaymentGatewayStatus.SUCCEEDED,
          webhook_last_event_at: new Date(),
          raw_payload: payload,
        },
      });

      // Log financial transaction & update client ledger
      const paymentResult = await logClientPaymentTransaction(tx, {
        organization_id: existingGatewayTx.organization_id,
        trip_id: existingGatewayTx.trip_id,
        client_ledger_id: existingGatewayTx.client_ledger_id,
        amount: amountPaid,
        payment_mode: PaymentMode.PAYMENT_GATEWAY,
        reference_number: `PADDLE-${gatewayTransactionId}`,
        remarks: `Paddle Online Checkout (${eventType})`,
      });

      return { updatedGatewayTx, paymentResult };
    });

    return NextResponse.json({
      success: true,
      idempotent: true,
      transaction_id: result.paymentResult.transaction.id,
      ledger_status: result.paymentResult.ledger.status,
      total_paid: result.paymentResult.ledger.total_paid_amount,
    });
  } catch (error: any) {
    console.error("Paddle webhook error:", error);
    return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
  }
}
