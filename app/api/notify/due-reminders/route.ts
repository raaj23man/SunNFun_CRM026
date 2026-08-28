import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hashApiKey } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";
import {
  getApproachingDuePaymentLedgers,
  emitNotifyEvent,
} from "@/lib/notify-service";
import { NotifyTriggerEvent } from "@prisma/client";

/**
 * Helper to resolve organization from session or API Key
 */
async function authenticateRequest(req: NextRequest) {
  // 1. Check user session
  const session = await getSession();
  if (session?.user) {
    return { organization_id: session.user.organization_id, user: session.user };
  }

  // 2. Check API Key header (for external n8n cron workflows)
  const authHeader = req.headers.get("authorization");
  const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
  const xApiKey = req.headers.get("x-api-key")?.trim();
  const apiKey = xApiKey || bearerKey;

  if (apiKey) {
    const keyHash = hashApiKey(apiKey);
    const connection = await prisma.integrationConnection.findUnique({
      where: { api_key_hash: keyHash },
    });
    if (connection && connection.is_active) {
      return { organization_id: connection.organization_id, connection };
    }
  }

  return null;
}

/**
 * GET /api/notify/due-reminders
 * Fetches all client ledgers with payments due within the next N hours (default 48h).
 * Accessible by session users or external n8n workflows using an integration API key.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized: Active session or valid API key required." },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const hoursParam = url.searchParams.get("hours");
  const hoursAhead = hoursParam ? parseInt(hoursParam, 10) : 48;

  try {
    const dueReminders = await getApproachingDuePaymentLedgers({
      organization_id: auth.organization_id,
      hoursAhead: isNaN(hoursAhead) ? 48 : hoursAhead,
    });

    return NextResponse.json({
      success: true,
      count: dueReminders.length,
      hours_window: hoursAhead,
      due_reminders: dueReminders,
    });
  } catch (error: any) {
    console.error("[Due Reminders Query Error]:", error);
    return NextResponse.json(
      { error: "Failed to query approaching due payments.", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notify/due-reminders
 * Triggers and emits PAYMENT_DUE_REMINDER Notify events for all approaching client ledgers.
 * Called by external n8n scheduled workflow or admin manual action.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized: Active session or valid API key required." },
      { status: 401 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const hoursAhead = typeof body.hours === "number" ? body.hours : 48;

  try {
    const dueReminders = await getApproachingDuePaymentLedgers({
      organization_id: auth.organization_id,
      hoursAhead,
    });

    const emittedResults: any[] = [];

    for (const reminder of dueReminders) {
      const emitRes = await emitNotifyEvent({
        event: NotifyTriggerEvent.PAYMENT_DUE_REMINDER,
        organization_id: auth.organization_id,
        entity_type: "ClientLedger",
        entity_id: reminder.client_ledger_id,
        trip_id: reminder.trip_id,
        context: {
          guest_name: reminder.guest_name,
          guest_phone: reminder.guest_phone,
          guest_email: reminder.guest_email,
          trip_display_id: reminder.trip_display_id,
          balance_due: reminder.balance_due,
          currency: reminder.currency,
          next_due_date: reminder.next_due_date,
          hours_remaining: reminder.hours_remaining,
          payment_link_url: reminder.payment_link_url,
          assigned_agent_name: reminder.assigned_agent_name,
        },
      });

      emittedResults.push({
        client_ledger_id: reminder.client_ledger_id,
        trip_display_id: reminder.trip_display_id,
        guest_name: reminder.guest_name,
        dispatched: emitRes.dispatched,
        rule_count: emitRes.rule_count,
      });
    }

    return NextResponse.json({
      success: true,
      reminders_evaluated: dueReminders.length,
      events_emitted: emittedResults,
      message: `Evaluated ${dueReminders.length} due reminders and emitted Notify events.`,
    });
  } catch (error: any) {
    console.error("[Due Reminders Trigger Error]:", error);
    return NextResponse.json(
      { error: "Failed to trigger due payment reminders.", details: error.message },
      { status: 500 }
    );
  }
}
