import { prisma } from "@/lib/prisma";
import {
  NotifyTriggerEvent,
  NotifyChannel,
  NotifyRecipientType,
  WebhookDirection,
  WebhookDeliveryStatus,
  LedgerPaymentStatus,
  ServiceBookingStatus,
} from "@prisma/client";
import { logWebhookDelivery } from "./webhook-logger";

export interface NotifyEventPayload {
  event: NotifyTriggerEvent;
  organization_id: string;
  entity_type: "ServiceBooking" | "ClientLedger" | "Trip" | "TripPlanRequest" | "Voucher";
  entity_id: string;
  trip_id?: string | null;
  context?: Record<string, any>;
  timestamp?: string;
}

export interface DuePaymentReminderItem {
  client_ledger_id: string;
  trip_id: string;
  trip_display_id: string;
  guest_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  assigned_agent_name: string | null;
  assigned_agent_email: string | null;
  total_billed_amount: number;
  total_paid_amount: number;
  balance_due: number;
  currency: string;
  next_due_date: string;
  hours_remaining: number;
  payment_link_url: string | null;
}

/**
 * Resolves full event context from database for an entity to enrich n8n / template payload.
 */
export async function resolveEntityContext(
  entityType: string,
  entityId: string,
  organizationId: string
): Promise<Record<string, any>> {
  try {
    if (entityType === "ServiceBooking") {
      const booking = await prisma.serviceBooking.findFirst({
        where: { id: entityId, organization_id: organizationId },
        include: {
          trip: {
            include: {
              guest: true,
              assigned_user: { select: { first_name: true, last_name: true, email: true, phone_number: true } },
            },
          },
          hotel: { select: { name: true, address: true } },
          supplier: { select: { name: true, contact_number: true, email: true } },
          vouchers: { select: { id: true, voucher_code: true, pdf_url: true } },
        },
      });

      if (!booking) return {};

      return {
        booking_id: booking.id,
        service_type: booking.service_type,
        service_name: booking.service_name,
        status: booking.status,
        service_date: booking.service_date?.toISOString(),
        supplier_confirmation_number: booking.supplier_confirmation_number,
        cost_price: Number(booking.cost_price),
        selling_price: Number(booking.selling_price),
        hotel_name: booking.hotel?.name || null,
        supplier_name: booking.supplier?.name || null,
        trip_id: booking.trip.id,
        trip_display_id: booking.trip.trip_display_id,
        guest_name: booking.trip.guest.full_name,
        guest_phone: booking.trip.guest.phone_number,
        guest_email: booking.trip.guest.email,
        assigned_agent: booking.trip.assigned_user
          ? `${booking.trip.assigned_user.first_name} ${booking.trip.assigned_user.last_name}`
          : null,
      };
    }

    if (entityType === "ClientLedger") {
      const ledger = await prisma.clientLedger.findFirst({
        where: { id: entityId, organization_id: organizationId },
        include: {
          trip: {
            include: {
              guest: true,
              assigned_user: { select: { first_name: true, last_name: true, email: true } },
            },
          },
          gateway_transactions: {
            where: { status: "PENDING" },
            orderBy: { created_at: "desc" },
            take: 1,
          },
        },
      });

      if (!ledger) return {};

      const totalBilled = Number(ledger.total_billed_amount);
      const totalPaid = Number(ledger.total_paid_amount);
      const balance = Math.max(0, totalBilled - totalPaid);

      return {
        client_ledger_id: ledger.id,
        trip_id: ledger.trip.id,
        trip_display_id: ledger.trip.trip_display_id,
        guest_name: ledger.trip.guest.full_name,
        guest_phone: ledger.trip.guest.phone_number,
        guest_email: ledger.trip.guest.email,
        total_billed_amount: totalBilled,
        total_paid_amount: totalPaid,
        balance_due: balance,
        currency: ledger.currency,
        next_due_date: ledger.next_due_date?.toISOString() || null,
        payment_link_url: ledger.gateway_transactions[0]?.payment_link_url || null,
      };
    }

    if (entityType === "TripPlanRequest") {
      const request = await prisma.tripPlanRequest.findFirst({
        where: { id: entityId, organization_id: organizationId },
        include: {
          assigned_user: { select: { first_name: true, last_name: true, email: true } },
        },
      });

      if (!request) return {};

      return {
        plan_request_id: request.id,
        source: request.source,
        guest_name: request.guest_name,
        phone_number: request.phone_number,
        email: request.email,
        destination_text: request.destination_text,
        status: request.status,
        assigned_user: request.assigned_user
          ? `${request.assigned_user.first_name} ${request.assigned_user.last_name}`
          : null,
      };
    }

    return {};
  } catch (error) {
    console.error("[NotifyService] Error resolving entity context:", error);
    return {};
  }
}

/**
 * Emits a lightweight Notify event to trigger active NotifyRules and external n8n webhook.
 */
export async function emitNotifyEvent(payload: NotifyEventPayload): Promise<{
  dispatched: boolean;
  rule_count: number;
  recipient_rules: any[];
}> {
  const timestamp = payload.timestamp || new Date().toISOString();

  let matchingRules: any[] = [];
  try {
    // 1. Find matching active NotifyRules for this trigger event in this org
    matchingRules = await prisma.notifyRule.findMany({
      where: {
        organization_id: payload.organization_id,
        trigger_event: payload.event,
        is_active: true,
      },
    });
  } catch (err: any) {
    console.warn("[NotifyService] Could not query NotifyRules from database:", err?.message || err);
  }

  // 2. Resolve enriched entity context if not already provided
  const context = payload.context && Object.keys(payload.context).length > 0
    ? payload.context
    : await resolveEntityContext(payload.entity_type, payload.entity_id, payload.organization_id);

  const eventData = {
    event: payload.event,
    organization_id: payload.organization_id,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    trip_id: payload.trip_id || context.trip_id || null,
    context,
    timestamp,
    matching_rules: matchingRules.map((r: any) => ({
      id: r.id,
      channel: r.channel,
      template_id: r.template_id,
      recipient_type: r.recipient_type,
    })),
  };

  // 3. Dispatch to n8n webhook if N8N_WEBHOOK_BASE_URL is configured
  const n8nBaseUrl = process.env.N8N_WEBHOOK_BASE_URL;
  let dispatched = false;

  if (n8nBaseUrl) {
    const webhookUrl = `${n8nBaseUrl.replace(/\/$/, "")}/crm/notify-event`;
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CRM-Event": payload.event,
          "X-CRM-Org": payload.organization_id,
        },
        body: JSON.stringify(eventData),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const isSuccess = response.ok;
      dispatched = isSuccess;

      await logWebhookDelivery({
        organization_id: payload.organization_id,
        direction: WebhookDirection.OUTBOUND,
        payload: eventData,
        status: isSuccess ? WebhookDeliveryStatus.SUCCESS : WebhookDeliveryStatus.FAILED,
        response_code: response.status,
        error_message: isSuccess ? null : `n8n responded with status ${response.status}: ${response.statusText}`,
      });
    } catch (err: any) {
      console.error(`[NotifyService] Outbound n8n webhook failed for ${payload.event}:`, err?.message || err);
      await logWebhookDelivery({
        organization_id: payload.organization_id,
        direction: WebhookDirection.OUTBOUND,
        payload: eventData,
        status: WebhookDeliveryStatus.FAILED,
        error_message: `Webhook dispatch network error: ${err?.message || String(err)}`,
      });
    }
  } else {
    // If no n8n URL configured (e.g. testing / local dev), still log the outbound delivery attempt
    await logWebhookDelivery({
      organization_id: payload.organization_id,
      direction: WebhookDirection.OUTBOUND,
      payload: eventData,
      status: WebhookDeliveryStatus.SUCCESS,
      error_message: "Local event emitted (N8N_WEBHOOK_BASE_URL not set).",
    });
    dispatched = true;
  }

  return {
    dispatched,
    rule_count: matchingRules.length,
    recipient_rules: matchingRules,
  };
}

/**
 * Scans ClientLedger for payments with due date approaching (e.g. within 48h).
 * Used by external n8n workflow or scheduled background job.
 */
export async function getApproachingDuePaymentLedgers(params: {
  organization_id?: string;
  hoursAhead?: number;
}): Promise<DuePaymentReminderItem[]> {
  const hoursAhead = params.hoursAhead ?? 48;
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() + hoursAhead);

  const whereClause: any = {
    status: {
      in: [LedgerPaymentStatus.UNPAID, LedgerPaymentStatus.PARTIAL],
    },
    next_due_date: {
      gte: now,
      lte: cutoff,
    },
  };

  if (params.organization_id) {
    whereClause.organization_id = params.organization_id;
  }

  try {
    const ledgers = await prisma.clientLedger.findMany({
      where: whereClause,
      include: {
        trip: {
          include: {
            guest: true,
            assigned_user: {
              select: { first_name: true, last_name: true, email: true },
            },
          },
        },
        gateway_transactions: {
          where: { status: "PENDING" },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
      orderBy: { next_due_date: "asc" },
    });

    return ledgers.map((l) => {
      const totalBilled = Number(l.total_billed_amount) || 0;
      const totalPaid = Number(l.total_paid_amount) || 0;
      const balanceDue = Math.max(0, totalBilled - totalPaid);
      const dueDate = l.next_due_date || now;
      const diffMs = dueDate.getTime() - now.getTime();
      const hoursRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));

      return {
        client_ledger_id: l.id,
        trip_id: l.trip.id,
        trip_display_id: l.trip.trip_display_id,
        guest_id: l.trip.guest.id,
        guest_name: l.trip.guest.full_name,
        guest_phone: l.trip.guest.phone_number,
        guest_email: l.trip.guest.email || null,
        assigned_agent_name: l.trip.assigned_user
          ? `${l.trip.assigned_user.first_name} ${l.trip.assigned_user.last_name}`
          : null,
        assigned_agent_email: l.trip.assigned_user?.email || null,
        total_billed_amount: totalBilled,
        total_paid_amount: totalPaid,
        balance_due: balanceDue,
        currency: l.currency,
        next_due_date: dueDate.toISOString(),
        hours_remaining: hoursRemaining,
        payment_link_url: l.gateway_transactions[0]?.payment_link_url || null,
      };
    });
  } catch (error: any) {
    console.warn("[NotifyService] Could not query ClientLedgers:", error?.message || error);
    return [];
  }
}

/**
 * Triggers a ServiceBooking status change event if applicable.
 */
export async function triggerBookingStatusChange(
  bookingId: string,
  newStatus: ServiceBookingStatus,
  organizationId: string,
  tripId?: string
) {
  if (newStatus === ServiceBookingStatus.CONFIRMED) {
    await emitNotifyEvent({
      event: NotifyTriggerEvent.BOOKING_CONFIRMED,
      organization_id: organizationId,
      entity_type: "ServiceBooking",
      entity_id: bookingId,
      trip_id: tripId,
    });
  } else if (newStatus === ServiceBookingStatus.VOUCHER_GENERATED) {
    await emitNotifyEvent({
      event: NotifyTriggerEvent.VOUCHER_GENERATED,
      organization_id: organizationId,
      entity_type: "ServiceBooking",
      entity_id: bookingId,
      trip_id: tripId,
    });
  }
}
