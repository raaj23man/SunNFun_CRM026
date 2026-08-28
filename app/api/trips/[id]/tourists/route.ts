import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

const createTouristSchema = z.object({
  full_name: z.string().min(1, "Tourist full name is required"),
  age: z.number().int().min(0).max(120).nullable().optional(),
  relation_to_primary_guest: z.string().nullable().optional(),
  assigned_service_ids: z.array(z.string()).default([]),
});

/**
 * POST /api/trips/:id/tourists
 * Adds a co-traveler / tourist row to a Trip.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const tripId = params?.id as string;

    if (!tripId) {
      throw new BadRequestError("Trip ID parameter is required.");
    }

    const trip = await scopedPrisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundError("Trip not found.");
    }

    const body = await req.json();
    const validated = createTouristSchema.parse(body);

    const tourist = await scopedPrisma.tourist.create({
      data: {
        trip_id: tripId,
        full_name: validated.full_name,
        age: validated.age || null,
        relation_to_primary_guest: validated.relation_to_primary_guest || null,
        assigned_service_ids: validated.assigned_service_ids,
      },
    });

    return NextResponse.json(
      {
        success: true,
        tourist,
        message: "Tourist added successfully.",
      },
      { status: 201 }
    );
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON", "OPERATIONS"],
  }
);
