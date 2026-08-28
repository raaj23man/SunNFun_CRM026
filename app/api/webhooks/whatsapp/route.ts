import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WebhookDirection, WebhookDeliveryStatus } from "@prisma/client";

/**
 * GET /api/webhooks/whatsapp
 * Meta WhatsApp Cloud API Webhook Verification Challenge.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "sunnfun_whatsapp_verify_token_2026";

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Delivery status callback from Meta WhatsApp Cloud API / Notify add-on.
 * Updates message delivery lifecycle (sent, delivered, read, failed).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const statuses = value?.statuses || [];

    const processedStatuses = [];

    for (const statusObj of statuses) {
      const messageId = statusObj.id;
      const status = statusObj.status; // "sent" | "delivered" | "read" | "failed"
      const recipientId = statusObj.recipient_id;
      const timestamp = statusObj.timestamp;

      processedStatuses.push({
        message_id: messageId,
        status,
        recipient_id: recipientId,
        timestamp,
      });
    }

    // Log the delivery status report
    await prisma.webhookDeliveryLog.create({
      data: {
        direction: WebhookDirection.INBOUND,
        payload: body,
        status: WebhookDeliveryStatus.SUCCESS,
        response_code: 200,
        error_message: statuses.length > 0 ? null : "Received event without status array",
      },
    });

    return NextResponse.json({
      success: true,
      received: true,
      processed_count: processedStatuses.length,
      statuses: processedStatuses,
    });
  } catch (error: any) {
    console.error("Error in WhatsApp webhook listener:", error);

    await prisma.webhookDeliveryLog.create({
      data: {
        direction: WebhookDirection.INBOUND,
        payload: { error: error.message },
        status: WebhookDeliveryStatus.FAILED,
        response_code: 500,
        error_message: error.message,
      },
    });

    return NextResponse.json({ error: error.message || "Failed to process WhatsApp webhook" }, { status: 500 });
  }
}
