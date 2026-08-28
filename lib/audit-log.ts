import { AuditAction } from "@prisma/client";

export type AuditEntityType =
  | "Hotel"
  | "RateSheet"
  | "TransportService"
  | "TravelActivity"
  | "Quote"
  | "Trip"
  | "TripSource"
  | "ServiceBooking"
  | "FinancialTransaction"
  | "UserPermissionOverride";

export interface CreateAuditLogParams {
  organization_id: string;
  actor_user_id?: string | null;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  diff?: any;
}

/**
 * Writes an AuditLog entry enforcing PRD Part 8 & Cross-Cutting Rule 3.
 */
export async function writeAuditLog(
  prismaClient: any,
  params: CreateAuditLogParams
) {
  try {
    return await prismaClient.auditLog.create({
      data: {
        organization_id: params.organization_id,
        actor_user_id: params.actor_user_id || null,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        action: params.action,
        diff: params.diff || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
    // Don't fail business transaction if logging fails, but log error
    return null;
  }
}
