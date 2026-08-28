import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { generateApiKey } from "@/lib/api-key";
import { IntegrationType } from "@prisma/client";

const updateIntegrationSchema = z.object({
  name: z.string().optional(),
  type: z.nativeEnum(IntegrationType).optional(),
  config: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
  regenerate_key: z.boolean().optional(),
});

/**
 * GET /api/integrations/[id]
 */
export const GET = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const id = params?.id as string;
    const connection = await scopedPrisma.integrationConnection.findUnique({
      where: { id },
      include: {
        delivery_logs: {
          orderBy: { attempted_at: "desc" },
          take: 20,
        },
      },
    });

    if (!connection || connection.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Integration connection not found" }, { status: 404 });
    }

    return NextResponse.json({
      connection: {
        id: connection.id,
        name: connection.name,
        type: connection.type,
        is_active: connection.is_active,
        config: connection.config,
        created_at: connection.created_at,
        updated_at: connection.updated_at,
        recent_logs: connection.delivery_logs,
      },
    });
  },
  { allowedRoles: ["SUPER_ADMIN", "ADMIN"] }
);

/**
 * PUT /api/integrations/[id]
 * Updates connection details or regenerates API key.
 */
export const PUT = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const id = params?.id as string;
    const body = await req.json();
    const validated = updateIntegrationSchema.parse(body);

    const existing = await scopedPrisma.integrationConnection.findUnique({
      where: { id },
    });

    if (!existing || existing.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Integration connection not found" }, { status: 404 });
    }

    let newApiKey: string | undefined;
    let apiKeyHash: string | undefined;

    if (validated.regenerate_key) {
      const generated = generateApiKey("snf_live_");
      newApiKey = generated.apiKey;
      apiKeyHash = generated.apiKeyHash;
    }

    const updated = await scopedPrisma.integrationConnection.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.type !== undefined && { type: validated.type }),
        ...(validated.config !== undefined && { config: validated.config }),
        ...(validated.is_active !== undefined && { is_active: validated.is_active }),
        ...(apiKeyHash && { api_key_hash: apiKeyHash }),
      },
    });

    return NextResponse.json({
      success: true,
      connection: {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        is_active: updated.is_active,
        config: updated.config,
        updated_at: updated.updated_at,
      },
      ...(newApiKey ? { api_key: newApiKey, warning: "New API key generated. Save it now." } : {}),
      message: "Integration connection updated successfully.",
    });
  },
  { allowedRoles: ["SUPER_ADMIN", "ADMIN"] }
);

/**
 * DELETE /api/integrations/[id]
 */
export const DELETE = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const id = params?.id as string;

    const existing = await scopedPrisma.integrationConnection.findUnique({
      where: { id },
    });

    if (!existing || existing.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Integration connection not found" }, { status: 404 });
    }

    await scopedPrisma.integrationConnection.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Integration connection deleted successfully.",
    });
  },
  { allowedRoles: ["SUPER_ADMIN", "ADMIN"] }
);
