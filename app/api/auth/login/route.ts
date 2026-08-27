import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  sign2FATempToken,
  SessionUser,
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

    // Retrieve user by email (global lookup for authentication)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
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
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

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

    await setSessionCookie(sessionUser);

    return NextResponse.json({
      success: true,
      user: sessionUser,
      organization: user.organization,
    });
  } catch (error: any) {
    console.error("[Login Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
