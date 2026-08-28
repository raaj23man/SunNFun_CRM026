import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { validateTripTransition, TripAction } from "@/lib/trip-lifecycle";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

const tripActionSchema = z.object({
  action: z.enum([
    "HOLD",
    "UNHOLD",
    "CANCEL",
    "REOPEN_CANCELLED",
    "DROP",
    "CONVERT",
    "COMPLETE",
    "LOCK",
    "UNLOCK",
  ]),
});

/**
 * POST /api/trips/:id/action
 * Executes a lifecycle state transition on a Trip enforcing Sembark-parity rules:
 * - Hold, Cancel, Drop are distinct actions
 * - Dropped trips cannot be reverted
 * - Cancelled pre-conversion trips can be reopened
 * - Locking requires Admin privileges
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const tripId = params?.id as string;

    if (!tripId) {
      throw new BadRequestError("Trip ID parameter is required.");
    }

    const body = await req.json();
    const { action } = tripActionSchema.parse(body);

    const trip = await scopedPrisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundError("Trip not found.");
    }

    // Validate transition via state machine
    const { nextStatus, isLocked } = validateTripTransition(
      trip,
      action as TripAction,
      user.role
    );

    const updateData: any = {
      status: nextStatus,
    };

    if (isLocked !== undefined) {
      updateData.is_locked = isLocked;
    }

    const updatedTrip = await scopedPrisma.trip.update({
      where: { id: tripId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      action,
      trip: updatedTrip,
      message: `Trip status updated to '${nextStatus}'.`,
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
    ],
  }
);
