import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  verify2FATempToken,
  verifyTOTP,
  setSessionCookie,
  SessionUser,
} from "@/lib/auth";

const verify2FASchema = z.object({
  tempToken: z.string().min(1, { message: "2FA challenge token is required" }),
  code: z
    .string()
    .length(6, { message: "2FA code must be exactly 6 digits" })
    .regex(/^\d+$/, { message: "2FA code must be numeric" }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verify2FASchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid 2FA payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { tempToken, code } = parsed.data;

    const tempPayload = await verify2FATempToken(tempToken);
    if (!tempPayload) {
      return NextResponse.json(
        { error: "2FA challenge has expired or is invalid. Please log in again." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: tempPayload.userId },
      include: { organization: true },
    });

    if (!user || !user.two_factor_secret) {
      return NextResponse.json(
        { error: "User 2FA configuration not found." },
        { status: 400 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is disabled. Please contact your administrator." },
        { status: 403 }
      );
    }

    const isValidCode = verifyTOTP(code, user.two_factor_secret);
    if (!isValidCode) {
      return NextResponse.json(
        { error: "Invalid authentication code. Please try again." },
        { status: 401 }
      );
    }

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
    console.error("[2FA Verify Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during 2FA verification." },
      { status: 500 }
    );
  }
}
