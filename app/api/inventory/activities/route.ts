import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";

/**
 * GET /api/inventory/activities
 * Search and list travel activities for autocomplete dropdowns.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const destinationId = searchParams.get("destination_id");

    const where: any = {
      organization_id: user.organization_id,
      is_archived: false,
    };

    if (q) {
      where.name = { contains: q, mode: "insensitive" };
    }

    if (destinationId) {
      where.destination_id = destinationId;
    }

    const activities = await scopedPrisma.travelActivity.findMany({
      where,
      include: {
        destination: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        rate_sheets: {
          where: { is_archived: false },
          orderBy: { valid_from: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      activities,
      total: activities.length,
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
      "DATA_OPERATOR",
      "ACCOUNTANT",
    ],
  }
);
