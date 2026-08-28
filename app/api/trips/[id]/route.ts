import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { NotFoundError } from "@/lib/api-error";

/**
 * GET /api/trips/:id
 * Retrieves full Trip details including Guest, Documents, Tourists, FollowUps, and Tasks.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const tripId = params?.id as string;

    const trip = await scopedPrisma.trip.findUnique({
      where: { id: tripId },
      include: {
        guest: {
          include: {
            documents: {
              orderBy: { created_at: "desc" },
            },
          },
        },
        tourists: {
          orderBy: { created_at: "asc" },
        },
        destination: true,
        secondary_destination: true,
        trip_source: true,
        brand: true,
        assigned_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        follow_ups: {
          include: {
            assigned_to: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
          orderBy: { due_date: "asc" },
        },
        tasks: {
          include: {
            created_by: {
              select: { id: true, first_name: true, last_name: true },
            },
            assigned_to: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!trip) {
      throw new NotFoundError("Trip not found.");
    }

    return NextResponse.json({ trip });
  },
  {
    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_HEAD",
      "SALES_PERSON",
      "OPERATIONS",
      "RESERVATIONS",
      "ACCOUNTANT",
      "DATA_OPERATOR",
    ],
  }
);
