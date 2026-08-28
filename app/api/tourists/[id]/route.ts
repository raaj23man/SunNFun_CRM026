import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

/**
 * DELETE /api/tourists/:id
 * Removes a tourist row from a trip.
 */
export const DELETE = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const touristId = params?.id as string;

    if (!touristId) {
      throw new BadRequestError("Tourist ID parameter is required.");
    }

    const tourist = await scopedPrisma.tourist.findUnique({
      where: { id: touristId },
      include: { trip: true },
    });

    if (!tourist) {
      throw new NotFoundError("Tourist not found.");
    }

    await scopedPrisma.tourist.delete({
      where: { id: touristId },
    });

    return NextResponse.json({
      success: true,
      message: "Tourist removed successfully.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON", "OPERATIONS"],
  }
);
