import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

/**
 * POST /api/inventory/activities/:id/archive
 * Sets is_archived = true. Enforces PRD Part 3 constraint: Activities cannot be hard-deleted.
 */
export const POST = withAuthAndRbac(
  async (req, { scopedPrisma, params }) => {
    const activityId = params?.id as string;

    if (!activityId) {
      throw new BadRequestError("Activity ID parameter is required.");
    }

    const activity = await scopedPrisma.travelActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundError("Travel activity not found.");
    }

    const updated = await scopedPrisma.travelActivity.update({
      where: { id: activityId },
      data: { is_archived: true },
    });

    return NextResponse.json({
      success: true,
      activity: updated,
      message: `Travel activity '${activity.name}' archived successfully.`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "DATA_OPERATOR"],
  }
);
