import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { PaymentGatewayProvider, PaymentGatewayStatus } from "@prisma/client";

const paymentLinkSchema = z.object({
  trip_id: z.string().min(1, "Trip ID is required"),
  amount: z.number().positive().optional(),
  currency: z.string().default("USD"),
});

/**
 * POST /api/finance/payment-links
 * Generates a Paddle-hosted online payment link for an accepted tour proposal.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = paymentLinkSchema.parse(body);

    const trip = await scopedPrisma.trip.findUnique({
      where: { id: validated.trip_id },
      include: {
        guest: true,
        client_ledger: true,
      },
    });

    if (!trip || trip.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Ensure client ledger exists
    let clientLedger = trip.client_ledger;
    if (!clientLedger) {
      clientLedger = await scopedPrisma.clientLedger.create({
        data: {
          organization_id: user.organization_id,
          trip_id: trip.id,
          total_billed_amount: trip.package_amount || 0,
          total_paid_amount: 0,
          currency: trip.currency || validated.currency,
        },
      });
    }

    const remainingBalance = Math.max(
      0,
      Number(clientLedger.total_billed_amount) - Number(clientLedger.total_paid_amount)
    );
    const amountToCharge = validated.amount || remainingBalance || Number(trip.package_amount) || 100;

    const gatewayTxId = `pdl_txn_${Date.now()}_${Math.random().toString(36).slice(-6)}`;
    const checkoutId = `pdl_chk_${Math.random().toString(36).slice(-8)}`;
    // Paddle hosted checkout simulation URL
    const paymentLinkUrl = `https://checkout.paddle.com/checkout/pay?txn=${gatewayTxId}&org=${user.organization_id}&trip=${trip.id}&amount=${amountToCharge}`;

    const gatewayTx = await scopedPrisma.paymentGatewayTransaction.create({
      data: {
        organization_id: user.organization_id,
        trip_id: trip.id,
        client_ledger_id: clientLedger.id,
        gateway: PaymentGatewayProvider.PADDLE,
        gateway_transaction_id: gatewayTxId,
        checkout_id: checkoutId,
        payment_link_url: paymentLinkUrl,
        status: PaymentGatewayStatus.PENDING,
        amount: amountToCharge,
        currency: clientLedger.currency,
        raw_payload: {
          customer_email: trip.guest?.email || "customer@example.com",
          customer_name: trip.guest?.full_name || "Guest",
          trip_display_id: trip.trip_display_id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      payment_link: {
        gateway_transaction_id: gatewayTx.gateway_transaction_id,
        checkout_url: paymentLinkUrl,
        amount: amountToCharge,
        currency: clientLedger.currency,
        remaining_balance: remainingBalance,
        status: gatewayTx.status,
      },
      message: "Paddle payment link generated successfully.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "SALES_HEAD", "SALES_PERSON"],
  }
);
