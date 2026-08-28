import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

/**
 * POST /api/trips/:id/quotes
 * Initializes a new Quote draft for a Trip with default day skeleton matching duration_days.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const tripId = params?.id as string;

    if (!tripId) {
      throw new BadRequestError("Trip ID parameter is required.");
    }

    const trip = await scopedPrisma.trip.findUnique({
      where: { id: tripId },
      include: { destination: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip not found.");
    }

    // Determine next version number for this trip
    const latestQuote = await scopedPrisma.quote.findFirst({
      where: { trip_id: tripId },
      orderBy: { version: "desc" },
    });

    const nextVersion = latestQuote ? latestQuote.version + 1 : 1;

    // Create Quote with Standard Option & Days matching trip.duration_days
    const daysData = Array.from({ length: trip.duration_days }, (_, i) => ({
      day_number: i + 1,
      title: i === 0 ? `Arrival in ${trip.destination?.name || "Destination"}` : i === trip.duration_days - 1 ? "Departure" : `Day ${i + 1} Sightseeing`,
      description: `Explore the vibrant highlights and cultural treasures.`,
      items: {
        create: [],
      },
    }));

    const quote = await scopedPrisma.quote.create({
      data: {
        organization_id: user.organization_id,
        trip_id: tripId,
        version: nextVersion,
        status: "DRAFT",
        pricing_strategy: "OVERALL",
        currency: trip.currency || "USD",
        options: {
          create: {
            option_label: "Standard",
            is_default: true,
            days: {
              create: daysData,
            },
          },
        },
      },
      include: {
        options: {
          include: {
            days: {
              include: { items: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        quote,
        message: `Quote v${nextVersion} created successfully.`,
      },
      { status: 201 }
    );
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON"],
  }
);
