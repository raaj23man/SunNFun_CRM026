import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

/**
 * PATCH /api/follow-ups/:id/complete
 * Marks a scheduled follow-up as COMPLETED.
 */
export const PATCH = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const followUpId = params?.id as string;

    if (!followUpId) {
      throw new BadRequestError("Follow-up ID parameter is required.");
    }

    const followUp = await scopedPrisma.followUp.findUnique({
      where: { id: followUpId },
    });

    if (!followUp) {
      throw new NotFoundError("Follow-up not found.");
    }

    const updated = await scopedPrisma.followUp.update({
      where: { id: followUpId },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({
      success: true,
      followUp: updated,
      message: "Follow-up marked as completed.",
    });
  },
  {
    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_HEAD",
      "SALES_PERSON",
      "OPERATIONS",
      "RESERVATIONS",
    ],
  }
);
