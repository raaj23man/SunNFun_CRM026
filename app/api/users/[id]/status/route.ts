import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserStatus } from "@prisma/client";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

/**
 * PUT /api/users/:id/status
 * Update user status (ACTIVE / DISABLED).
 */
export const PUT = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const targetUserId = params?.id as string;

    if (!targetUserId) {
      throw new BadRequestError("User ID parameter is required.");
    }

    // Prevent self-disable
    if (targetUserId === user.id) {
      throw new BadRequestError("You cannot disable your own user account.");
    }

    const body = await req.json();
    const validated = updateStatusSchema.parse(body);

    const targetUser = await scopedPrisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundError("User not found.");
    }

    const updatedUser = await scopedPrisma.user.update({
      where: { id: targetUserId },
      data: { status: validated.status },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User status changed to ${validated.status}.`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  }
);
