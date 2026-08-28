import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { WebhookDirection } from "@prisma/client";

/**
 * GET /api/notify/events
 * Returns recent outbound notification events and webhook delivery logs.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const direction = searchParams.get("direction") as WebhookDirection | null;

    const logs = await scopedPrisma.webhookDeliveryLog.findMany({
      where: {
        organization_id: user.organization_id,
        ...(direction && { direction }),
      },
      orderBy: { attempted_at: "desc" },
      take: limit,
    });

    return NextResponse.json({
      count: logs.length,
      logs,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS"],
  }
);
