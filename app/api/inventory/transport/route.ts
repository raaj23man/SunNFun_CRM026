import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";

/**
 * GET /api/inventory/transport
 * Search and list transport services for autocomplete dropdowns.
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
      where.cab_type = { contains: q, mode: "insensitive" };
    }

    if (destinationId) {
      where.destination_id = destinationId;
    }

    const services = await scopedPrisma.transportService.findMany({
      where,
      include: {
        destination: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        rate_sheets: {
          where: { is_archived: false },
          orderBy: { valid_from: "asc" },
        },
      },
      orderBy: { cab_type: "asc" },
    });

    return NextResponse.json({
      services,
      total: services.length,
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
