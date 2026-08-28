import { prisma } from "@/lib/prisma";
import { NotifyTriggerEvent, NotifyChannel, WebhookDirection, WebhookDeliveryStatus } from "@prisma/client";

export interface NotifyEventParams {
  organization_id: string;
  trigger_event: NotifyTriggerEvent;
  entity_id: string;
  context: Record<string, any>;
  recipient_phone?: string;
  recipient_email?: string;
}

/**
 * Dispatches an event to registered NotifyRules and external n8n webhook listener.
 * Logs all outbound automation attempts to WebhookDeliveryLog.
 */
export async function emitNotifyTrigger(
  params: NotifyEventParams,
  dbClient: any = prisma
) {
  try {
    // 1. Fetch matching active NotifyRules for the organization
    let activeRules: any[] = [];
    try {
      activeRules = await dbClient.notifyRule.findMany({
        where: {
          organization_id: params.organization_id,
          trigger_event: params.trigger_event,
          is_active: true,
        },
      });
    } catch {
      activeRules = [];
    }

    const results = [];

    // 2. Prepare payload for n8n orchestration
    const payload = {
      event: params.trigger_event,
      entity_id: params.entity_id,
      timestamp: new Date().toISOString(),
      recipient: {
        phone: params.recipient_phone,
        email: params.recipient_email,
      },
      context: params.context,
      matching_rules_count: activeRules.length,
      rules: activeRules.map((r) => ({
        id: r.id,
        channel: r.channel,
        template_id: r.template_id,
        recipient_type: r.recipient_type,
      })),
    };

    const n8nBaseUrl = process.env.N8N_WEBHOOK_BASE_URL;

    if (n8nBaseUrl) {
      try {
        const response = await fetch(`${n8nBaseUrl}/webhook/notify-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const status = response.ok ? WebhookDeliveryStatus.SUCCESS : WebhookDeliveryStatus.FAILED;

        // Log outbound call
        try {
          await dbClient.webhookDeliveryLog.create({
            data: {
              organization_id: params.organization_id,
              direction: WebhookDirection.OUTBOUND,
              payload: payload as any,
              status,
              response_code: response.status,
              error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
            },
          });
        } catch {}

        results.push({ dispatched: true, status: response.status });
      } catch (err: any) {
        try {
          await dbClient.webhookDeliveryLog.create({
            data: {
              organization_id: params.organization_id,
              direction: WebhookDirection.OUTBOUND,
              payload: payload as any,
              status: WebhookDeliveryStatus.FAILED,
              error_message: err.message || "Failed to reach n8n webhook",
            },
          });
        } catch {}
        results.push({ dispatched: false, error: err.message });
      }
    } else {
      // Local event recorded in log
      try {
        await dbClient.webhookDeliveryLog.create({
          data: {
            organization_id: params.organization_id,
            direction: WebhookDirection.OUTBOUND,
            payload: payload as any,
            status: WebhookDeliveryStatus.SUCCESS,
            response_code: 200,
          },
        });
      } catch {}
      results.push({ dispatched: true, status: "LOGGED_LOCAL" });
    }

    return {
      success: true,
      event: params.trigger_event,
      active_rules: activeRules.length,
      dispatched_results: results,
    };
  } catch (error: any) {
    console.error("Error in emitNotifyTrigger:", error);
    return { success: false, error: error.message };
  }
}
