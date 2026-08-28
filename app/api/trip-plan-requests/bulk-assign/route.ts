import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError } from "@/lib/api-error";

const bulkAssignSchema = z.object({
  request_ids: z.array(z.string()).min(1, "At least one request ID required."),
  assigned_user_id: z.string().min(1, "Assigned user ID is required."),
});

/**
 * POST /api/trip-plan-requests/bulk-assign
 * Sembark v1.174 feature: Bulk assigns selected inbound leads to a team member.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const { request_ids, assigned_user_id } = bulkAssignSchema.parse(body);

    const updateResult = await scopedPrisma.tripPlanRequest.updateMany({
      where: {
        organization_id: user.organization_id,
        id: { in: request_ids },
      },
      data: {
        assigned_user_id,
        status: "ASSIGNED",
      },
    });

    return NextResponse.json({
      success: true,
      updated_count: updateResult.count,
      message: `Successfully assigned ${updateResult.count} trip plan requests.`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD"],
  }
);
