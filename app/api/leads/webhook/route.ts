import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limiter";
import { WebhookDirection, WebhookDeliveryStatus, PlanRequestStatus, PlanRequestSource } from "@prisma/client";
import { emitNotifyTrigger } from "@/lib/notify-dispatcher";

const leadWebhookSchema = z.object({
  source: z.string().min(1, "Source identifier is required"),
  guest_name: z.string().min(1, "Guest name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().nullable(),
  destination_text: z.string().optional().nullable(),
  budget_hint: z.string().optional().nullable(),
  pax: z.number().int().positive().optional().nullable(),
  travel_dates: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key.trim()).digest("hex");
}

function resolvePlanSource(sourceStr: string): PlanRequestSource {
  const upper = sourceStr.toUpperCase().replace(/[\s-]/g, "_");
  if (Object.values(PlanRequestSource).includes(upper as PlanRequestSource)) {
    return upper as PlanRequestSource;
  }
  if (upper.includes("META") || upper.includes("FACEBOOK") || upper.includes("INSTA")) return PlanRequestSource.META_ADS;
  if (upper.includes("GOOGLE_ADS") || upper.includes("ADWORDS")) return PlanRequestSource.GOOGLE_ADS;
  if (upper.includes("GOOGLE_FORM")) return PlanRequestSource.GOOGLE_FORM;
  if (upper.includes("CHAT") || upper.includes("BOT")) return PlanRequestSource.CHATBOT;
  if (upper.includes("EMAIL")) return PlanRequestSource.EMAIL_INBOX;
  if (upper.includes("WIX")) return PlanRequestSource.WIX;
  return PlanRequestSource.WEBSITE_FORM;
}

/**
 * POST /api/leads/webhook
 * Public omnichannel lead capture webhook endpoint.
 * Protected by API key (IntegrationConnection), rate-limited, Zod-validated.
 * Always logs to WebhookDeliveryLog on both success and failure.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  let rawBody: any = null;
  let connection: any = null;

  try {
    rawBody = await req.json().catch(() => ({}));

    // 1. API Key Extraction
    const apiKey =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      req.nextUrl.searchParams.get("api_key");

    if (!apiKey) {
      await prisma.webhookDeliveryLog.create({
        data: {
          direction: WebhookDirection.INBOUND,
          payload: rawBody || {},
          status: WebhookDeliveryStatus.FAILED,
          response_code: 401,
          error_message: "Missing API Key. Provide via 'x-api-key' header or 'Authorization: Bearer <key>'.",
        },
      });
      return NextResponse.json({ error: "Missing API Key" }, { status: 401 });
    }

    const hashedKey = hashApiKey(apiKey);

    // Look up IntegrationConnection (match exact hash or raw key for demo flexibility)
    connection = await prisma.integrationConnection.findFirst({
      where: {
        OR: [{ api_key_hash: hashedKey }, { api_key_hash: apiKey }],
        is_active: true,
      },
    });

    if (!connection) {
      await prisma.webhookDeliveryLog.create({
        data: {
          direction: WebhookDirection.INBOUND,
          payload: rawBody || {},
          status: WebhookDeliveryStatus.FAILED,
          response_code: 401,
          error_message: "Invalid or inactive API Key.",
        },
      });
      return NextResponse.json({ error: "Unauthorized: Invalid API Key" }, { status: 401 });
    }

    // 2. Rate Limiting (Upstash / Memory)
    const rateLimit = await checkRateLimit(`lead_webhook_${connection.id}_${ip}`, 100, 60);
    if (!rateLimit.success) {
      await prisma.webhookDeliveryLog.create({
        data: {
          organization_id: connection.organization_id,
          integration_connection_id: connection.id,
          direction: WebhookDirection.INBOUND,
          payload: rawBody,
          status: WebhookDeliveryStatus.FAILED,
          response_code: 429,
          error_message: "Rate limit exceeded (Max 100 req/min).",
        },
      });
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    // 3. Payload Schema Validation
    const validationResult = leadWebhookSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      await prisma.webhookDeliveryLog.create({
        data: {
          organization_id: connection.organization_id,
          integration_connection_id: connection.id,
          direction: WebhookDirection.INBOUND,
          payload: rawBody,
          status: WebhookDeliveryStatus.FAILED,
          response_code: 400,
          error_message: `Validation Error: ${errorMsg}`,
        },
      });
      return NextResponse.json({ error: "Malformed payload", details: errorMsg }, { status: 400 });
    }

    const data = validationResult.data;

    // 4. Find or Create Guest
    let guest = await prisma.guest.findFirst({
      where: {
        organization_id: connection.organization_id,
        OR: [
          { phone_number: data.phone },
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
    });

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          organization_id: connection.organization_id,
          full_name: data.guest_name,
          phone_number: data.phone,
          email: data.email || null,
        },
      });
    }

    // 5. Auto-Distribution: Round-robin or available sales agent
    const availableAgent = await prisma.user.findFirst({
      where: {
        organization_id: connection.organization_id,
        role: { in: ["SALES_PERSON", "SALES_HEAD", "ADMIN"] },
      },
      orderBy: { created_at: "asc" },
    });

    const mappedSource = resolvePlanSource(data.source);

    // 6. Create TripPlanRequest
    const planRequest = await prisma.tripPlanRequest.create({
      data: {
        organization_id: connection.organization_id,
        guest_name: data.guest_name,
        phone_number: data.phone,
        email: data.email || null,
        assigned_user_id: availableAgent?.id || null,
        status: availableAgent ? PlanRequestStatus.ASSIGNED : PlanRequestStatus.UNASSIGNED,
        source: mappedSource,
        raw_payload: data.metadata || (data as any),
        destination_text: data.destination_text || "Custom Destination",
      },
    });

    // 7. Log Successful Ingestion
    await prisma.webhookDeliveryLog.create({
      data: {
        organization_id: connection.organization_id,
        integration_connection_id: connection.id,
        direction: WebhookDirection.INBOUND,
        payload: data as any,
        status: WebhookDeliveryStatus.SUCCESS,
        response_code: 200,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Lead successfully ingested and TripPlanRequest created.",
      trip_plan_request_id: planRequest.id,
      guest_id: guest.id,
      assigned_agent_id: availableAgent?.id || null,
    });
  } catch (error: any) {
    console.error("Error processing lead webhook:", error);

    if (connection?.organization_id) {
      await prisma.webhookDeliveryLog.create({
        data: {
          organization_id: connection.organization_id,
          integration_connection_id: connection?.id || null,
          direction: WebhookDirection.INBOUND,
          payload: rawBody || {},
          status: WebhookDeliveryStatus.FAILED,
          response_code: 500,
          error_message: error.message || "Internal server error",
        },
      });
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
