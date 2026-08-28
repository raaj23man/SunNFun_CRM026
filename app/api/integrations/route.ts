import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { generateApiKey } from "@/lib/api-key";
import { IntegrationType } from "@prisma/client";

const createIntegrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(IntegrationType).default(IntegrationType.WEBSITE_FORM),
  config: z.record(z.any()).optional(),
  is_active: z.boolean().default(true),
});

/**
 * GET /api/integrations
 * Lists all active and inactive integration connections for the tenant organization.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const connections = await scopedPrisma.integrationConnection.findMany({
      where: { organization_id: user.organization_id },
      include: {
        _count: {
          select: { delivery_logs: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      connections: connections.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        is_active: c.is_active,
        config: c.config,
        logs_count: c._count.delivery_logs,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      count: connections.length,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  }
);

/**
 * POST /api/integrations
 * Creates a new IntegrationConnection, generates a cryptographically secure API key,
 * stores the SHA-256 hash, and returns the raw API key once to the admin.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = createIntegrationSchema.parse(body);

    const { apiKey, apiKeyHash } = generateApiKey("snf_live_");

    const connection = await scopedPrisma.integrationConnection.create({
      data: {
        organization_id: user.organization_id,
        name: validated.name,
        type: validated.type,
        api_key_hash: apiKeyHash,
        config: validated.config || {},
        is_active: validated.is_active,
      },
    });

    return NextResponse.json(
      {
        success: true,
        connection: {
          id: connection.id,
          name: connection.name,
          type: connection.type,
          is_active: connection.is_active,
          config: connection.config,
          created_at: connection.created_at,
        },
        api_key: apiKey,
        warning: "Copy this API key now. It will not be shown again.",
        webhook_endpoint: "/api/leads/webhook",
      },
      { status: 201 }
    );
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  }
);
