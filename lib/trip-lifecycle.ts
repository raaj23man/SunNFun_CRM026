import { TripStatus, Role } from "@prisma/client";
import { BadRequestError, ForbiddenError } from "./api-error";

export type TripAction =
  | "HOLD"
  | "UNHOLD"
  | "CANCEL"
  | "REOPEN_CANCELLED"
  | "DROP"
  | "CONVERT"
  | "COMPLETE"
  | "LOCK"
  | "UNLOCK";

export interface TripStateContext {
  id: string;
  status: TripStatus;
  is_locked: boolean;
  is_archived: boolean;
  organization_id: string;
}

/**
 * Validates whether a specific lifecycle action can be performed on a Trip.
 * Enforces Sembark-documented lifecycle rules:
 * - Hold, Cancel, and Drop are distinct, non-interchangeable states.
 * - Dropped trips CANNOT be reverted (irreversible terminal state).
 * - Cancelled pre-conversion trips CAN be reverted/reopened.
 * - Locked trips cannot undergo status changes until unlocked by an Admin.
 */
export function validateTripTransition(
  trip: TripStateContext,
  action: TripAction,
  userRole?: Role
): { nextStatus: TripStatus; isLocked?: boolean } {
  // Guard 1: Locked trips check
  if (trip.is_locked && action !== "UNLOCK") {
    throw new ForbiddenError(
      "Trip is locked. It must be unlocked by an administrator before modifications."
    );
  }

  // Guard 2: Archived trips check
  if (trip.is_archived && action !== "UNLOCK") {
    throw new ForbiddenError("Archived trips cannot undergo status modifications.");
  }

  switch (action) {
    case "HOLD":
      if (trip.status !== "NEW_QUERY" && trip.status !== "IN_PROGRESS") {
        throw new BadRequestError(
          `Cannot place trip on hold from status '${trip.status}'. Hold is only valid for pre-conversion active inquiries.`
        );
      }
      return { nextStatus: "ON_HOLD" };

    case "UNHOLD":
      if (trip.status !== "ON_HOLD") {
        throw new BadRequestError(`Cannot un-hold a trip that is currently '${trip.status}'.`);
      }
      return { nextStatus: "IN_PROGRESS" };

    case "CANCEL":
      // Pre-conversion cancellation
      if (trip.status === "CONVERTED" || trip.status === "COMPLETED") {
        throw new BadRequestError(
          "Cannot Cancel a converted or completed trip. Converted bookings must be Dropped (with cancellation processing)."
        );
      }
      if (trip.status === "DROPPED") {
        throw new BadRequestError("Trip is already Dropped (terminal state).");
      }
      if (trip.status === "CANCELLED") {
        throw new BadRequestError("Trip is already Cancelled.");
      }
      return { nextStatus: "CANCELLED" };

    case "REOPEN_CANCELLED":
      // Revert a pre-conversion cancelled inquiry
      if (trip.status !== "CANCELLED") {
        throw new BadRequestError(
          `Cannot reopen a trip from status '${trip.status}'. Only pre-conversion CANCELLED trips can be reopened.`
        );
      }
      return { nextStatus: "IN_PROGRESS" };

    case "DROP":
      // Post-conversion terminal drop
      if (trip.status !== "CONVERTED") {
        throw new BadRequestError(
          `Cannot Drop trip with status '${trip.status}'. Only CONVERTED bookings can be Dropped.`
        );
      }
      return { nextStatus: "DROPPED" };

    case "CONVERT":
      if (
        trip.status !== "NEW_QUERY" &&
        trip.status !== "IN_PROGRESS" &&
        trip.status !== "ON_HOLD"
      ) {
        throw new BadRequestError(
          `Cannot convert trip from status '${trip.status}'. Lead must be in active status.`
        );
      }
      return { nextStatus: "CONVERTED" };

    case "COMPLETE":
      if (trip.status !== "CONVERTED") {
        throw new BadRequestError(
          `Cannot mark trip as completed from status '${trip.status}'. Must be CONVERTED.`
        );
      }
      return { nextStatus: "COMPLETED" };

    case "LOCK":
      if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN") {
        throw new ForbiddenError("Only Administrators can lock a trip.");
      }
      return { nextStatus: trip.status, isLocked: true };

    case "UNLOCK":
      if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN") {
        throw new ForbiddenError("Only Administrators can unlock a trip.");
      }
      return { nextStatus: trip.status, isLocked: false };

    default:
      throw new BadRequestError(`Unknown trip action: ${action}`);
  }
}
