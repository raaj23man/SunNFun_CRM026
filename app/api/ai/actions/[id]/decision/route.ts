import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { AIHumanDecision } from "@prisma/client";
import { recordHumanDecision } from "@/lib/ai-action-logger";

const decisionSchema = z.object({
  decision: z.nativeEnum(AIHumanDecision),
  diff: z.record(z.any()).optional(),
});

/**
 * POST /api/ai/actions/:id/decision
 * Records human agent review decision (APPROVED, EDITED, REJECTED) on an AI action log.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const actionLogId = params?.id as string;
    const body = await req.json();
    const validated = decisionSchema.parse(body);

    const log = await scopedPrisma.aIActionLog.findUnique({
      where: { id: actionLogId },
    });

    if (!log || log.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "AI action log not found" }, { status: 404 });
    }

    const updated = await recordHumanDecision(
      {
        action_log_id: actionLogId,
        organization_id: user.organization_id,
        user_id: user.id,
        decision: validated.decision,
        diff: validated.diff,
      },
      scopedPrisma
    );

    return NextResponse.json({
      success: true,
      action_log: updated,
      message: `AI action recorded with human decision: ${validated.decision}`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON", "OPERATIONS", "RESERVATIONS"],
  }
);
