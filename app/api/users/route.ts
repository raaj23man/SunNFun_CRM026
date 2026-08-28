import { NextRequest, NextResponse } from "next/server";
import { Role, UserStatus } from "@prisma/client";
import { withAuthAndRbac } from "@/lib/rbac";

/**
 * GET /api/users
 * Lists org users with optional filters: status, role, team_id.
 * Accessible to ADMIN, SUPER_ADMIN, SALES_HEAD.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as UserStatus | null;
    const roleParam = searchParams.get("role") as Role | null;
    const teamIdParam = searchParams.get("team_id");

    const whereClause: any = {
      organization_id: user.organization_id,
    };

    if (statusParam && Object.values(UserStatus).includes(statusParam)) {
      whereClause.status = statusParam;
    }

    if (roleParam && Object.values(Role).includes(roleParam)) {
      whereClause.role = roleParam;
    }

    if (teamIdParam) {
      whereClause.team_id = teamIdParam;
    }

    const users = await scopedPrisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        role: true,
        status: true,
        last_login: true,
        created_at: true,
        team_id: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        permission_overrides: {
          select: {
            id: true,
            permission_key: true,
            granted: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      users,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD"],
  }
);
