import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createWebAuthnAuthenticationOptions,
  verifyWebAuthnAuthenticationResponse,
  setSessionCookie,
  SessionUser,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const options = await createWebAuthnAuthenticationOptions();
    return NextResponse.json(options);
  } catch (error: any) {
    console.error("[WebAuthn Login Options Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate authentication options." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { authenticationResponse } = body;

    if (!authenticationResponse || !authenticationResponse.id) {
      return NextResponse.json(
        { error: "Invalid WebAuthn authentication payload." },
        { status: 400 }
      );
    }

    const passkey = await prisma.passkey.findUnique({
      where: { credential_id: authenticationResponse.id },
      include: {
        user: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!passkey || !passkey.user) {
      return NextResponse.json(
        { error: "Passkey not recognized or not associated with an account." },
        { status: 404 }
      );
    }

    const { user } = passkey;

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is disabled. Please contact your organization administrator." },
        { status: 403 }
      );
    }

    const verification = await verifyWebAuthnAuthenticationResponse(
      authenticationResponse,
      {
        credential_id: passkey.credential_id,
        public_key: passkey.public_key,
        counter: passkey.counter,
      }
    );

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Passkey authentication signature failed verification." },
        { status: 401 }
      );
    }

    // Update counter and last_used_at on the passkey
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        last_used_at: new Date(),
      },
    });

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
    console.error("[WebAuthn Login Verify Error]:", error);
    return NextResponse.json(
      { error: error.message || "Passkey login failed." },
      { status: 500 }
    );
  }
}
