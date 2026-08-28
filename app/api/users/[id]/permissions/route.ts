import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

const updatePermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      permission_key: z.string().min(1, "Permission key is required"),
      granted: z.boolean(),
    })
  ),
});

/**
 * PUT /api/users/:id/permissions
 * Upsert UserPermissionOverride entries for a given user.
 */
export const PUT = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const targetUserId = params?.id as string;

    if (!targetUserId) {
      throw new BadRequestError("User ID parameter is required.");
    }

    const body = await req.json();
    const validated = updatePermissionsSchema.parse(body);

    const targetUser = await scopedPrisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundError("User not found.");
    }

    // Process overrides
    for (const item of validated.permissions) {
      await scopedPrisma.userPermissionOverride.upsert({
        where: {
          user_id_permission_key: {
            user_id: targetUserId,
            permission_key: item.permission_key,
          },
        },
        update: {
          granted: item.granted,
        },
        create: {
          user_id: targetUserId,
          permission_key: item.permission_key,
          granted: item.granted,
        },
      });
    }

    const updatedOverrides = await scopedPrisma.userPermissionOverride.findMany({
      where: { user_id: targetUserId },
    });

    return NextResponse.json({
      success: true,
      permissions: updatedOverrides,
      message: "User permission overrides updated successfully.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  }
);
