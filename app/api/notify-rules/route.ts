import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import {
  NotifyTriggerEvent,
  NotifyChannel,
  NotifyRecipientType,
} from "@prisma/client";

const createNotifyRuleSchema = z.object({
  name: z.string().optional(),
  trigger_event: z.nativeEnum(NotifyTriggerEvent),
  channel: z.nativeEnum(NotifyChannel).default(NotifyChannel.WHATSAPP),
  template_id: z.string().min(1, "Template ID / Meta template name is required"),
  recipient_type: z.nativeEnum(NotifyRecipientType).default(NotifyRecipientType.GUEST),
  is_active: z.boolean().default(true),
  config: z.record(z.any()).optional(),
});

/**
 * GET /api/notify-rules
 * Lists all configured Notify (WhatsApp/Email) automation rules for the tenant organization.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const rules = await scopedPrisma.notifyRule.findMany({
      where: { organization_id: user.organization_id },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      rules,
      count: rules.length,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS"],
  }
);

/**
 * POST /api/notify-rules
 * Creates a new Notify automation trigger rule.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = createNotifyRuleSchema.parse(body);

    const rule = await scopedPrisma.notifyRule.create({
      data: {
        organization_id: user.organization_id,
        name: validated.name || `${validated.trigger_event} via ${validated.channel}`,
        trigger_event: validated.trigger_event,
        channel: validated.channel,
        template_id: validated.template_id,
        recipient_type: validated.recipient_type,
        is_active: validated.is_active,
        config: validated.config || {},
      },
    });

    return NextResponse.json(
      {
        success: true,
        rule,
        message: "Notify automation rule created successfully.",
      },
      { status: 201 }
    );
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  }
);
