import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

/**
 * POST /api/inventory/transport/:id/archive
 * Sets is_archived = true. Enforces PRD Part 3 constraint: Transport types cannot be hard-deleted.
 */
export const POST = withAuthAndRbac(
  async (req, { scopedPrisma, params }) => {
    const transportId = params?.id as string;

    if (!transportId) {
      throw new BadRequestError("Transport ID parameter is required.");
    }

    const transport = await scopedPrisma.transportService.findUnique({
      where: { id: transportId },
    });

    if (!transport) {
      throw new NotFoundError("Transport service not found.");
    }

    const updated = await scopedPrisma.transportService.update({
      where: { id: transportId },
      data: { is_archived: true },
    });

    return NextResponse.json({
      success: true,
      transport: updated,
      message: `Transport service '${transport.cab_type}' archived successfully.`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "DATA_OPERATOR"],
  }
);
