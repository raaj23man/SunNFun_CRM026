import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME, verifySessionJWT } from "@/lib/auth";
import { resolveUserPermissions } from "@/lib/rbac";
import { getTenantPrisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    let session = await getSession();

    if (!session || !session.user) {
      const token =
        req.cookies.get(SESSION_COOKIE_NAME)?.value ||
        req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (token) {
        session = await verifySessionJWT(token);
      }
    }

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required." },
        { status: 401 }
      );
    }

    let user: any = null;
    try {
      const tenantPrisma = getTenantPrisma(session.user.organization_id);

      user = await tenantPrisma.user.findFirst({
        where: { id: session.user.id },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              destination_scope: true,
            },
          },
          permission_overrides: true,
          organization: {
            include: {
              brands: {
                where: { is_default: true },
                take: 1,
              },
            },
          },
        },
      });
    } catch (err: any) {
      console.warn("[Auth Me] Database lookup failed, using session payload:", err.message);
      // Return session data directly for local demo offline testing
      return NextResponse.json({
        user: {
          ...session.user,
          permissions: resolveUserPermissions(session.user.role, []),
          organization: {
            id: session.user.organization_id,
            company_name: "SunNFun Holidays",
            default_brand: { id: "brand_default", name: "SunNFun Holidays", color_theme: "emerald" },
          },
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "User account is disabled." },
        { status: 403 }
      );
    }

    const resolvedPermissions = resolveUserPermissions(
      user.role,
      user.permission_overrides
    );

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      role: user.role,
      status: user.status,
      last_login: user.last_login,
      two_factor_enabled: user.two_factor_enabled,
      theme_preference: user.theme_preference,
      team: user.team,
      created_at: user.created_at,
    };

    const defaultBrand = user.organization.brands[0] || null;

    return NextResponse.json({
      user: sanitizedUser,
      organization: {
        id: user.organization.id,
        company_name: user.organization.company_name,
        brand_short_name: user.organization.brand_short_name,
        trip_prefix: user.organization.trip_prefix,
        default_timezone: user.organization.default_timezone,
        force_2fa: user.organization.force_2fa,
        brand: defaultBrand,
      },
      permissions: resolvedPermissions,
    });
  } catch (error: any) {
    console.error("[Auth /me Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve authenticated user profile." },
      { status: 500 }
    );
  }
}
