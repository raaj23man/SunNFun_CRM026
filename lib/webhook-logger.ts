import { prisma } from "@/lib/prisma";
import { WebhookDirection, WebhookDeliveryStatus } from "@prisma/client";

export interface LogWebhookParams {
  organization_id?: string | null;
  integration_connection_id?: string | null;
  direction?: WebhookDirection;
  payload: any;
  status: WebhookDeliveryStatus;
  error_message?: string | null;
  response_code?: number | null;
}

/**
 * Logs every inbound or outbound webhook call to WebhookDeliveryLog.
 * Guarantees that logging errors never crash the primary request handler.
 */
export async function logWebhookDelivery(params: LogWebhookParams) {
  try {
    const log = await prisma.webhookDeliveryLog.create({
      data: {
        organization_id: params.organization_id || null,
        integration_connection_id: params.integration_connection_id || null,
        direction: params.direction || WebhookDirection.INBOUND,
        payload: params.payload ?? {},
        status: params.status,
        error_message: params.error_message || null,
        response_code: params.response_code || null,
        attempted_at: new Date(),
      },
    });
    return log;
  } catch (error: any) {
    console.error("[WebhookDeliveryLog] Failed to persist delivery log:", error?.message || error);
    return null;
  }
}
