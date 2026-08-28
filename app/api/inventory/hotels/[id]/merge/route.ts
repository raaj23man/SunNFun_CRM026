import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

const mergeHotelSchema = z.object({
  mergeIntoId: z.string().min(1, "Target hotel ID 'mergeIntoId' is required."),
});

/**
 * POST /api/inventory/hotels/:id/merge
 * Merges a duplicate Hotel record into a primary Hotel.
 * Enforces PRD Part 3 constraint: Hotels are never hard-deleted; historical references are merged.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const sourceHotelId = params?.id as string;

    if (!sourceHotelId) {
      throw new BadRequestError("Source hotel ID parameter is required.");
    }

    const body = await req.json();
    const { mergeIntoId } = mergeHotelSchema.parse(body);

    if (sourceHotelId === mergeIntoId) {
      throw new BadRequestError("Cannot merge a hotel into itself.");
    }

    // 1. Verify both hotels exist in caller's organization
    const sourceHotel = await scopedPrisma.hotel.findUnique({
      where: { id: sourceHotelId },
      include: { rooms: true },
    });

    if (!sourceHotel) {
      throw new NotFoundError("Source hotel to merge from not found.");
    }

    if (sourceHotel.is_archived) {
      throw new BadRequestError("Source hotel is already archived or merged.");
    }

    const targetHotel = await scopedPrisma.hotel.findUnique({
      where: { id: mergeIntoId },
      include: { rooms: true },
    });

    if (!targetHotel) {
      throw new NotFoundError("Target hotel to merge into not found.");
    }

    if (targetHotel.is_archived) {
      throw new BadRequestError("Target hotel is archived and cannot receive merged data.");
    }

    // 2. Migrate rooms from source hotel to target hotel
    await scopedPrisma.hotelRoom.updateMany({
      where: { hotel_id: sourceHotelId },
      data: { hotel_id: mergeIntoId },
    });

    // 3. Mark source hotel as merged & archived
    const mergedSource = await scopedPrisma.hotel.update({
      where: { id: sourceHotelId },
      data: {
        is_archived: true,
        merged_into_id: mergeIntoId,
      },
    });

    // 4. Fetch consolidated target hotel
    const updatedTargetHotel = await scopedPrisma.hotel.findUnique({
      where: { id: mergeIntoId },
      include: {
        rooms: {
          include: {
            rate_sheets: true,
          },
        },
        destination: true,
        supplier: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully merged '${sourceHotel.name}' into '${targetHotel.name}'.`,
      primaryHotel: updatedTargetHotel,
      mergedHotel: mergedSource,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "DATA_OPERATOR"],
  }
);
