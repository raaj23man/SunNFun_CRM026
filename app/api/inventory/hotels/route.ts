import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";

/**
 * GET /api/inventory/hotels
 * Search and filter hotels by query string q, destination_id, or star rating.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const destinationId = searchParams.get("destination_id");
    const starRating = searchParams.get("star_rating");
    const showArchived = searchParams.get("show_archived") === "true";

    const where: any = {
      organization_id: user.organization_id,
    };

    if (!showArchived) {
      where.is_archived = false;
    }

    if (q) {
      where.name = { contains: q, mode: "insensitive" };
    }

    if (destinationId) {
      where.destination_id = destinationId;
    }

    if (starRating) {
      where.star_rating = parseInt(starRating, 10);
    }

    const hotels = await scopedPrisma.hotel.findMany({
      where,
      include: {
        destination: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
        rooms: {
          include: {
            rate_sheets: {
              where: { is_archived: false },
              orderBy: { valid_from: "asc" },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      hotels,
      total: hotels.length,
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
