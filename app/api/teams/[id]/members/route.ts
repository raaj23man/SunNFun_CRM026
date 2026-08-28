import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

const updateTeamMembersSchema = z.object({
  user_ids: z.array(z.string()),
});

/**
 * PUT /api/teams/:id/members
 * Update the member assignments for a team.
 */
export const PUT = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const teamId = params?.id as string;

    if (!teamId) {
      throw new BadRequestError("Team ID parameter is required.");
    }

    const team = await scopedPrisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundError("Team not found.");
    }

    const body = await req.json();
    const validated = updateTeamMembersSchema.parse(body);

    // Unassign previous members of this team
    await scopedPrisma.user.updateMany({
      where: {
        organization_id: user.organization_id,
        team_id: teamId,
      },
      data: { team_id: null },
    });

    // Assign new members
    if (validated.user_ids.length > 0) {
      await scopedPrisma.user.updateMany({
        where: {
          organization_id: user.organization_id,
          id: { in: validated.user_ids },
        },
        data: { team_id: teamId },
      });
    }

    const updatedTeam = await scopedPrisma.team.findUnique({
      where: { id: teamId },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      team: updatedTeam,
      message: "Team members updated successfully.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD"],
  }
);
