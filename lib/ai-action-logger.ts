import { prisma } from "@/lib/prisma";
import { AIActionType, AIHumanDecision } from "@prisma/client";

export interface LogAIActionParams {
  organization_id: string;
  actor_user_id?: string | null;
  action_type: AIActionType;
  input_ref?: string | null;
  output_ref?: string | null;
  confidence_score?: number | null;
  raw_input?: any;
  raw_output?: any;
  model_name?: string | null;
}

export interface UpdateAIHumanDecisionParams {
  action_log_id: string;
  organization_id: string;
  user_id: string;
  decision: AIHumanDecision;
  diff?: any;
}

/**
 * Persists an entry in the AIActionLog audit trail.
 * Never throws or disrupts core operational workflows.
 */
export async function logAIAction(
  params: LogAIActionParams,
  dbClient: any = prisma
) {
  try {
    const entry = await dbClient.aIActionLog.create({
      data: {
        organization_id: params.organization_id,
        actor_user_id: params.actor_user_id || null,
        action_type: params.action_type,
        input_ref: params.input_ref || null,
        output_ref: params.output_ref || null,
        confidence_score: params.confidence_score ?? null,
        human_decision: AIHumanDecision.PENDING,
        raw_input: params.raw_input ?? null,
        raw_output: params.raw_output ?? null,
        model_name: params.model_name || "claude-3-5-sonnet-20241022",
      },
    });
    return entry;
  } catch (error: any) {
    console.warn("[AIActionLog] Failed to persist AI action audit entry:", error?.message || error);
    return null;
  }
}

/**
 * Updates an AI action with the human agent's approval, edit, or rejection.
 */
export async function recordHumanDecision(
  params: UpdateAIHumanDecisionParams,
  dbClient: any = prisma
) {
  const updated = await dbClient.aIActionLog.update({
    where: {
      id: params.action_log_id,
    },
    data: {
      human_decision: params.decision,
      human_decision_user_id: params.user_id,
      human_decision_at: new Date(),
      human_decision_diff: params.diff ?? null,
    },
  });

  return updated;
}
