import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { WebhookDirection, WebhookDeliveryStatus } from "@prisma/client";

/**
 * GET /api/webhooks/logs
 * Queries WebhookDeliveryLog for the organization with filtering by direction, status, or date range.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const url = new URL(req.url);
    const direction = url.searchParams.get("direction") as WebhookDirection | null;
    const status = url.searchParams.get("status") as WebhookDeliveryStatus | null;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const where: any = {
      OR: [
        { organization_id: user.organization_id },
        { integration_connection: { organization_id: user.organization_id } },
      ],
    };

    if (direction && Object.values(WebhookDirection).includes(direction)) {
      where.direction = direction;
    }

    if (status && Object.values(WebhookDeliveryStatus).includes(status)) {
      where.status = status;
    }

    const logs = await scopedPrisma.webhookDeliveryLog.findMany({
      where,
      include: {
        integration_connection: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { attempted_at: "desc" },
      take: isNaN(limit) ? 50 : Math.min(limit, 100),
    });

    return NextResponse.json({
      logs,
      count: logs.length,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS"],
  }
);
