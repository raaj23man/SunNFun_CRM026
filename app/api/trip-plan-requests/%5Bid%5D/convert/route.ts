import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { generateTripDisplayId } from "@/lib/trip-id";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

/**
 * POST /api/trip-plan-requests/:id/convert
 * Converts an unqualified inbound request into an official active Trip query.
 * Creates/links Guest + Trip, sets status to NEW_QUERY, and links converted_trip_id.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const requestId = params?.id as string;

    if (!requestId) {
      throw new BadRequestError("Request ID parameter is required.");
    }

    const planRequest = await scopedPrisma.tripPlanRequest.findUnique({
      where: { id: requestId },
    });

    if (!planRequest) {
      throw new NotFoundError("Trip plan request not found.");
    }

    if (planRequest.status === "CONVERTED_TO_TRIP" && planRequest.converted_trip_id) {
      throw new BadRequestError("This plan request has already been converted to a Trip.");
    }

    // 1. Find or create Guest by phone number
    let guest = await scopedPrisma.guest.findFirst({
      where: {
        organization_id: user.organization_id,
        phone_number: planRequest.phone_number,
      },
    });

    if (!guest) {
      guest = await scopedPrisma.guest.create({
        data: {
          organization_id: user.organization_id,
          full_name: planRequest.guest_name,
          phone_number: planRequest.phone_number,
          email: planRequest.email || null,
          is_repeat_traveler: false,
        },
      });
    } else {
      // Mark as repeat traveler if guest already had prior trips
      const priorTripsCount = await scopedPrisma.trip.count({
        where: { guest_id: guest.id },
      });
      if (priorTripsCount > 0 && !guest.is_repeat_traveler) {
        await scopedPrisma.guest.update({
          where: { id: guest.id },
          data: { is_repeat_traveler: true },
        });
      }
    }

    // 2. Resolve default brand
    let brand = await scopedPrisma.brand.findFirst({
      where: { organization_id: user.organization_id, is_default: true },
    });
    if (!brand) {
      brand = await scopedPrisma.brand.findFirst({
        where: { organization_id: user.organization_id },
      });
    }
    if (!brand) {
      brand = await scopedPrisma.brand.create({
        data: {
          organization_id: user.organization_id,
          name: "Main Brand",
          is_default: true,
        },
      });
    }

    // 3. Resolve destination
    let destination = await scopedPrisma.tripDestination.findFirst({
      where: {
        organization_id: user.organization_id,
        name: { contains: planRequest.destination_text.slice(0, 20), mode: "insensitive" },
      },
    });
    if (!destination) {
      destination = await scopedPrisma.tripDestination.create({
        data: {
          organization_id: user.organization_id,
          name: planRequest.destination_text || "Custom Itinerary",
        },
      });
    }

    // 4. Generate sequential trip display ID (e.g. SBC-10001)
    const { sequence_number, trip_display_id } = await generateTripDisplayId(
      user.organization_id,
      scopedPrisma
    );

    const targetAssignedUserId = planRequest.assigned_user_id || user.id;

    // 5. Default travel date 14 days out
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() + 14);

    // 6. Create Trip record
    const trip = await scopedPrisma.trip.create({
      data: {
        organization_id: user.organization_id,
        brand_id: brand.id,
        assigned_user_id: targetAssignedUserId,
        guest_id: guest.id,
        destination_id: destination.id,
        sequence_number,
        trip_display_id,
        start_date: defaultStartDate,
        duration_days: 5,
        duration_nights: 4,
        pax_adults: 2,
        pax_children: 0,
        status: "NEW_QUERY",
        tags: ["Inbound Webhook", planRequest.source],
      },
    });

    // 7. Update Plan Request
    await scopedPrisma.tripPlanRequest.update({
      where: { id: requestId },
      data: {
        status: "CONVERTED_TO_TRIP",
        converted_trip_id: trip.id,
      },
    });

    return NextResponse.json({
      success: true,
      trip,
      message: `Request successfully converted to Query ${trip_display_id}.`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON"],
  }
);
