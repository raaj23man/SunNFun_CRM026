import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { PlanRequestSource, PlanRequestStatus } from "@prisma/client";

const createPlanRequestSchema = z.object({
  source: z.nativeEnum(PlanRequestSource).default(PlanRequestSource.MANUAL),
  guest_name: z.string().min(1, "Guest name is required"),
  phone_number: z.string().min(1, "Phone number is required"),
  email: z.string().email().nullable().optional(),
  destination_text: z.string().min(1, "Destination text is required"),
  raw_payload: z.any().optional(),
});

/**
 * GET /api/trip-plan-requests
 * Retrieves trip plan requests with optional filters: status, source, assigned_user_id.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as PlanRequestStatus | null;
    const source = searchParams.get("source") as PlanRequestSource | null;

    const where: any = {
      organization_id: user.organization_id,
    };

    if (status && Object.values(PlanRequestStatus).includes(status)) {
      where.status = status;
    }

    if (source && Object.values(PlanRequestSource).includes(source)) {
      where.source = source;
    }

    const requests = await scopedPrisma.tripPlanRequest.findMany({
      where,
      include: {
        assigned_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        converted_trip: {
          select: { id: true, trip_display_id: true, status: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      requests,
      count: requests.length,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON"],
  }
);

/**
 * POST /api/trip-plan-requests
 * Creates a raw inbound trip plan request (manual entry or webhook payload).
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = createPlanRequestSchema.parse(body);

    const planRequest = await scopedPrisma.tripPlanRequest.create({
      data: {
        organization_id: user.organization_id,
        source: validated.source,
        guest_name: validated.guest_name,
        phone_number: validated.phone_number,
        email: validated.email || null,
        destination_text: validated.destination_text,
        raw_payload: validated.raw_payload || null,
        status: "UNASSIGNED",
      },
    });

    return NextResponse.json(
      {
        success: true,
        planRequest,
        message: "Trip plan request created successfully.",
      },
      { status: 201 }
    );
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON"],
  }
);
