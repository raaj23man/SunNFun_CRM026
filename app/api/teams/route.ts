import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  destination_scope: z.array(z.string()).default([]),
});

/**
 * GET /api/teams
 * List all teams within the organization.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const teams = await scopedPrisma.team.findMany({
      where: { organization_id: user.organization_id },
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
      orderBy: { created_at: "asc" },
    });

    return NextResponse.json({ teams });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD"],
  }
);

/**
 * POST /api/teams
 * Create a new team in the organization.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = createTeamSchema.parse(body);

    const team = await scopedPrisma.team.create({
      data: {
        organization_id: user.organization_id,
        name: validated.name,
        destination_scope: validated.destination_scope,
      },
      include: {
        users: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        team,
        message: "Team created successfully.",
      },
      { status: 201 }
    );
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD"],
  }
);
