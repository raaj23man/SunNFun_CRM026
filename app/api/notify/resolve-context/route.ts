import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { hashApiKey } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";
import { resolveEntityContext } from "@/lib/notify-service";

const resolveContextSchema = z.object({
  entity_type: z.enum(["ServiceBooking", "ClientLedger", "Trip", "TripPlanRequest", "Voucher"]),
  entity_id: z.string().min(1, "entity_id is required"),
});

async function authenticateRequest(req: NextRequest) {
  const session = await getSession();
  if (session?.user) {
    return { organization_id: session.user.organization_id };
  }

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
      return { organization_id: connection.organization_id };
    }
  }

  return null;
}

/**
 * POST /api/notify/resolve-context
 * Resolves full relational context for an entity (ServiceBooking, ClientLedger, Trip, Voucher)
 * Called by external n8n workflows when rendering Meta-approved WhatsApp templates.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized: Active session or valid API key required." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const validated = resolveContextSchema.parse(body);

    const context = await resolveEntityContext(
      validated.entity_type,
      validated.entity_id,
      auth.organization_id
    );

    return NextResponse.json({
      success: true,
      entity_type: validated.entity_type,
      entity_id: validated.entity_id,
      context,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to resolve entity context", details: error.message },
      { status: 400 }
    );
  }
}
