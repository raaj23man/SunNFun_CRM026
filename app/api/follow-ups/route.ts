import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError } from "@/lib/api-error";

const createFollowUpSchema = z.object({
  trip_id: z.string().min(1, "Trip ID is required"),
  due_date: z.string().min(1, "Due date is required"),
  remarks: z.string().min(1, "Remarks/notes are required"),
  is_actionable_comment: z.boolean().default(true),
  assigned_to_user_id: z.string().optional(),
});

/**
 * POST /api/follow-ups
 * Creates a scheduled follow-up or internal remark on a Trip.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = createFollowUpSchema.parse(body);

    const trip = await scopedPrisma.trip.findUnique({
      where: { id: validated.trip_id },
    });

    if (!trip) {
      throw new BadRequestError("Trip not found.");
    }

    const assignedTo = validated.assigned_to_user_id || user.id;

    const followUp = await scopedPrisma.followUp.create({
      data: {
        trip_id: validated.trip_id,
        assigned_to_user_id: assignedTo,
        due_date: new Date(validated.due_date),
        remarks: validated.remarks,
        is_actionable_comment: validated.is_actionable_comment,
        status: "PENDING",
      },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    // Touch Trip updated_at to clear stale warning
    await scopedPrisma.trip.update({
      where: { id: validated.trip_id },
      data: { updated_at: new Date() },
    });

    return NextResponse.json(
      {
        success: true,
        followUp,
        message: "Follow-up scheduled successfully.",
      },
      { status: 201 }
    );
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
