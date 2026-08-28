import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import {
  NotifyTriggerEvent,
  NotifyChannel,
  NotifyRecipientType,
} from "@prisma/client";

const updateNotifyRuleSchema = z.object({
  name: z.string().optional(),
  trigger_event: z.nativeEnum(NotifyTriggerEvent).optional(),
  channel: z.nativeEnum(NotifyChannel).optional(),
  template_id: z.string().min(1).optional(),
  recipient_type: z.nativeEnum(NotifyRecipientType).optional(),
  is_active: z.boolean().optional(),
  config: z.record(z.any()).optional(),
});

/**
 * GET /api/notify-rules/[id]
 */
export const GET = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const id = params?.id as string;
    const rule = await scopedPrisma.notifyRule.findUnique({
      where: { id },
    });

    if (!rule || rule.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Notify rule not found" }, { status: 404 });
    }

    return NextResponse.json({ rule });
  },
  { allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS"] }
);

/**
 * PUT /api/notify-rules/[id]
 */
export const PUT = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const id = params?.id as string;
    const body = await req.json();
    const validated = updateNotifyRuleSchema.parse(body);

    const existing = await scopedPrisma.notifyRule.findUnique({
      where: { id },
    });

    if (!existing || existing.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Notify rule not found" }, { status: 404 });
    }

    const updated = await scopedPrisma.notifyRule.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.trigger_event !== undefined && { trigger_event: validated.trigger_event }),
        ...(validated.channel !== undefined && { channel: validated.channel }),
        ...(validated.template_id !== undefined && { template_id: validated.template_id }),
        ...(validated.recipient_type !== undefined && { recipient_type: validated.recipient_type }),
        ...(validated.is_active !== undefined && { is_active: validated.is_active }),
        ...(validated.config !== undefined && { config: validated.config }),
      },
    });

    return NextResponse.json({
      success: true,
      rule: updated,
      message: "Notify rule updated successfully.",
    });
  },
  { allowedRoles: ["SUPER_ADMIN", "ADMIN"] }
);

/**
 * DELETE /api/notify-rules/[id]
 */
export const DELETE = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const id = params?.id as string;

    const existing = await scopedPrisma.notifyRule.findUnique({
      where: { id },
    });

    if (!existing || existing.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Notify rule not found" }, { status: 404 });
    }

    await scopedPrisma.notifyRule.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Notify rule deleted successfully.",
    });
  },
  { allowedRoles: ["SUPER_ADMIN", "ADMIN"] }
);
