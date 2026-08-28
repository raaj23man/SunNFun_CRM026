import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

const mergeSourceSchema = z.object({
  mergeIntoId: z.string().min(1, "Target trip source ID 'mergeIntoId' is required."),
});

/**
 * POST /api/trip-sources/:id/merge
 * Merges a duplicate TripSource into a primary TripSource.
 * Reassigns all associated Trips to the target source and archives the source record.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const sourceId = params?.id as string;

    if (!sourceId) {
      throw new BadRequestError("Source trip source ID parameter is required.");
    }

    const body = await req.json();
    const { mergeIntoId } = mergeSourceSchema.parse(body);

    if (sourceId === mergeIntoId) {
      throw new BadRequestError("Cannot merge a trip source into itself.");
    }

    // 1. Verify both trip sources exist in caller's organization
    const source = await scopedPrisma.tripSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundError("Source trip source not found.");
    }

    if (source.is_archived) {
      throw new BadRequestError("Source trip source is already archived or merged.");
    }

    const target = await scopedPrisma.tripSource.findUnique({
      where: { id: mergeIntoId },
    });

    if (!target) {
      throw new NotFoundError("Target trip source not found.");
    }

    if (target.is_archived) {
      throw new BadRequestError("Target trip source is archived.");
    }

    // 2. Reassign all trips from source to target
    await scopedPrisma.trip.updateMany({
      where: {
        organization_id: user.organization_id,
        trip_source_id: sourceId,
      },
      data: {
        trip_source_id: mergeIntoId,
      },
    });

    // 3. Mark source as merged & archived
    const mergedSource = await scopedPrisma.tripSource.update({
      where: { id: sourceId },
      data: {
        is_archived: true,
        merged_into_id: mergeIntoId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully merged trip source '${source.name}' into '${target.name}'.`,
      primarySource: target,
      mergedSource,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  }
);
