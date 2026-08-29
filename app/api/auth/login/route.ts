import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  sign2FATempToken,
  SessionUser,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email({ message: "Valid email address is required" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid login credentials", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    let user: any = null;
    try {
      // Retrieve user by email (global lookup for authentication)
      user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: {
          organization: {
            select: {
              id: true,
              company_name: true,
              force_2fa: true,
            },
          },
        },
      });
    } catch (dbErr: any) {
      console.warn("[Login] Local database unreachable, evaluating demo credentials:", dbErr.message);

      // Demo fallback credentials for local offline browser testing
      const DEMO_USERS: Record<string, { role: any; first_name: string; last_name: string; org_name: string }> = {
        "superadmin@sunnfun.test": { role: "SUPER_ADMIN", first_name: "Super", last_name: "Admin", org_name: "SunNFun Holidays" },
        "admin@sunnfunholidays.com": { role: "SUPER_ADMIN", first_name: "Super", last_name: "Admin", org_name: "SunNFun Holidays" },
        "saleshead@sunnfun.test": { role: "SALES_HEAD", first_name: "Sales", last_name: "Head", org_name: "SunNFun Holidays" },
        "salesperson@sunnfun.test": { role: "SALES_PERSON", first_name: "Sales", last_name: "Agent", org_name: "SunNFun Holidays" },
        "operations@sunnfun.test": { role: "OPERATIONS", first_name: "Operations", last_name: "Manager", org_name: "SunNFun Holidays" },
        "accountant@sunnfun.test": { role: "ACCOUNTANT", first_name: "Chief", last_name: "Accountant", org_name: "SunNFun Holidays" },
      };

      const demoUser = DEMO_USERS[cleanEmail];
      if (demoUser && password === "Password123!") {
        const sessionUser: SessionUser = {
          id: `usr_demo_${demoUser.role.toLowerCase()}`,
          email: cleanEmail,
          first_name: demoUser.first_name,
          last_name: demoUser.last_name,
          role: demoUser.role,
          status: "ACTIVE",
          organization_id: "org_sunnfun_demo_001",
          team_id: null,
          two_factor_enabled: false,
        };

        const token = await setSessionCookie(sessionUser);

        const response = NextResponse.json({
          success: true,
          user: sessionUser,
          token,
          organization: { id: "org_sunnfun_demo_001", company_name: demoUser.org_name },
        });

        response.cookies.set(SESSION_COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });

        return response;
      }

      return NextResponse.json(
        { error: "Database unreachable and invalid demo credentials. Use 'Password123!' with a demo email." },
        { status: 401 }
      );
    }

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is disabled. Please contact your organization administrator." },
        { status: 403 }
      );
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Check if 2FA is required (user setting OR org-wide forced 2FA)
    const requires2FA =
      (user.two_factor_enabled || user.organization.force_2fa) &&
      !!user.two_factor_secret;

    if (requires2FA) {
      const tempToken = await sign2FATempToken({
        userId: user.id,
        email: user.email,
        organizationId: user.organization_id,
      });

      return NextResponse.json({
        requires2FA: true,
        tempToken,
        message: "2FA authentication code required.",
      });
    }

    // Update last login timestamp
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() },
      });
    } catch {}

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      status: user.status,
      organization_id: user.organization_id,
      team_id: user.team_id,
      two_factor_enabled: user.two_factor_enabled,
    };

    const token = await setSessionCookie(sessionUser);

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      token,
      organization: user.organization,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("[Login Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
