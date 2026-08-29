import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { generateTripDisplayId } from "@/lib/trip-id";
import { TripStatus } from "@prisma/client";

const createTripSchema = z.object({
  // Guest fields
  salutation: z.string().optional(),
  guest_name: z.string().min(1, "Guest name is required"),
  phone_number: z.string().min(1, "Phone number is required"),
  email: z.string().email().nullable().optional(),

  // Trip fields
  destination_id: z.string().nullable().optional(),
  destination_text: z.string().optional(),
  start_date: z.string().min(1, "Start date is required"),
  duration_days: z.number().int().positive().default(5),
  duration_nights: z.number().int().nonnegative().default(4),
  pax_adults: z.number().int().min(1).default(2),
  pax_children: z.number().int().min(0).default(0),
  origin_city: z.string().nullable().optional(),
  trip_source_id: z.string().nullable().optional(),
  team_id: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  assigned_user_id: z.string().optional(),
});

/**
 * GET /api/trips
 * Retrieves trips / queries with filter parameters:
 * - status: TripStatus
 * - search: string (guest name, phone, or trip_display_id)
 * - destination_id: string
 * - assigned_user_id: string
 * - show_archived: boolean
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as TripStatus | null;
    const search = searchParams.get("search") || "";
    const destinationId = searchParams.get("destination_id");
    const assignedUserId = searchParams.get("assigned_user_id");
    const showArchived = searchParams.get("show_archived") === "true";

    const where: any = {
      organization_id: user.organization_id,
    };

    if (!showArchived) {
      where.is_archived = false;
    }

    if (statusParam && Object.values(TripStatus).includes(statusParam)) {
      where.status = statusParam;
    }

    // Role scoping: SALES_PERSON sees own trips unless assigned
    if (user.role === "SALES_PERSON") {
      where.assigned_user_id = user.id;
    } else if (assignedUserId) {
      where.assigned_user_id = assignedUserId;
    }

    if (destinationId) {
      where.destination_id = destinationId;
    }

    if (search) {
      where.OR = [
        { trip_display_id: { contains: search, mode: "insensitive" } },
        { guest: { full_name: { contains: search, mode: "insensitive" } } },
        { guest: { phone_number: { contains: search } } },
      ];
    }

    let trips: any[] = [];
    try {
      trips = await scopedPrisma.trip.findMany({
        where,
        include: {
          guest: {
            select: {
              id: true,
              full_name: true,
              phone_number: true,
              email: true,
              salutation: true,
              is_repeat_traveler: true,
            },
          },
          destination: {
            select: { id: true, name: true },
          },
          assigned_user: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          trip_source: {
            select: { id: true, name: true, type: true },
          },
          _count: {
            select: { tourists: true, follow_ups: true, tasks: true },
          },
        },
        orderBy: { created_at: "desc" },
      });
    } catch (err: any) {
      console.warn("[Trips API] Database query failed, using demo dummy trips:", err.message);
      const { MOCK_TRIPS } = await import("@/lib/mock-data-store");
      trips = MOCK_TRIPS.filter((t) => {
        if (statusParam && t.status !== statusParam) return false;
        if (search) {
          const matchId = t.trip_display_id.toLowerCase().includes(search.toLowerCase());
          const matchName = t.guest.full_name.toLowerCase().includes(search.toLowerCase());
          const matchPhone = t.guest.phone_number.includes(search);
          if (!matchId && !matchName && !matchPhone) return false;
        }
        return true;
      });
    }

    const now = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(now.getDate() - 3);

    // Compute has_stale_activity_warning per Sembark specification
    const enrichedTrips = trips.map((t) => {
      const isStale = t.status === "IN_PROGRESS" && new Date(t.updated_at || Date.now()) < threeDaysAgo;
      return {
        ...t,
        has_stale_activity_warning: isStale,
      };
    });

    return NextResponse.json({
      trips: enrichedTrips,
      count: enrichedTrips.length,
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
      "ACCOUNTANT",
      "DATA_OPERATOR",
    ],
  }
);

/**
 * POST /api/trips
 * Manual "Add New Query" flow creating a Guest + Trip with sequential trip_display_id.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = createTripSchema.parse(body);

    // 1. Find or create Guest by phone number
    let guest = await scopedPrisma.guest.findFirst({
      where: {
        organization_id: user.organization_id,
        phone_number: validated.phone_number,
      },
    });

    let duplicateGuestWarning = false;

    if (!guest) {
      guest = await scopedPrisma.guest.create({
        data: {
          organization_id: user.organization_id,
          full_name: validated.guest_name,
          phone_number: validated.phone_number,
          email: validated.email || null,
          salutation: validated.salutation || null,
          is_repeat_traveler: false,
        },
      });
    } else {
      duplicateGuestWarning = true;
      if (!guest.is_repeat_traveler) {
        await scopedPrisma.guest.update({
          where: { id: guest.id },
          data: { is_repeat_traveler: true },
        });
      }
    }

    // 2. Resolve default Brand
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
          name: "Default Brand",
          is_default: true,
        },
      });
    }

    // 3. Resolve Destination if custom text was typed
    let destId = validated.destination_id;
    if (!destId && validated.destination_text) {
      let dest = await scopedPrisma.tripDestination.findFirst({
        where: {
          organization_id: user.organization_id,
          name: { equals: validated.destination_text, mode: "insensitive" },
        },
      });
      if (!dest) {
        dest = await scopedPrisma.tripDestination.create({
          data: {
            organization_id: user.organization_id,
            name: validated.destination_text,
          },
        });
      }
      destId = dest.id;
    }

    // 4. Generate sequential trip display ID
    const { sequence_number, trip_display_id } = await generateTripDisplayId(
      user.organization_id,
      scopedPrisma
    );

    const assignedUserId =
      user.role === "SALES_PERSON" ? user.id : validated.assigned_user_id || user.id;

    // 5. Create Trip
    const trip = await scopedPrisma.trip.create({
      data: {
        organization_id: user.organization_id,
        brand_id: brand.id,
        team_id: validated.team_id || null,
        assigned_user_id: assignedUserId,
        guest_id: guest.id,
        destination_id: destId || null,
        sequence_number,
        trip_display_id,
        start_date: new Date(validated.start_date),
        duration_days: validated.duration_days,
        duration_nights: validated.duration_nights,
        pax_adults: validated.pax_adults,
        pax_children: validated.pax_children,
        origin_city: validated.origin_city || null,
        trip_source_id: validated.trip_source_id || null,
        status: "NEW_QUERY",
        tags: validated.tags,
      },
      include: {
        guest: true,
        destination: true,
        assigned_user: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        trip,
        duplicateGuestWarning,
        message: `Query ${trip_display_id} created successfully.`,
      },
      { status: 201 }
    );
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON"],
  }
);
