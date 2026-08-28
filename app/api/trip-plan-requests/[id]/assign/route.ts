import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

const assignSchema = z.object({
  assigned_user_id: z.string().min(1, "User ID to assign is required."),
});

/**
 * POST /api/trip-plan-requests/:id/assign
 * Assigns a trip plan request to a sales agent.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const requestId = params?.id as string;

    if (!requestId) {
      throw new BadRequestError("Request ID parameter is required.");
    }

    const body = await req.json();
    const { assigned_user_id } = assignSchema.parse(body);

    const planRequest = await scopedPrisma.tripPlanRequest.findUnique({
      where: { id: requestId },
    });

    if (!planRequest) {
      throw new NotFoundError("Trip plan request not found.");
    }

    const updated = await scopedPrisma.tripPlanRequest.update({
      where: { id: requestId },
      data: {
        assigned_user_id,
        status: "ASSIGNED",
      },
      include: {
        assigned_user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      planRequest: updated,
      message: "Lead assigned successfully.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON"],
  }
);
