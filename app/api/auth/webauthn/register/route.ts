import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getSession,
  createWebAuthnRegistrationOptions,
  verifyWebAuthnRegistrationResponse,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required to register a passkey." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        passkeys: {
          select: { credential_id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const options = await createWebAuthnRegistrationOptions({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      existingPasskeys: user.passkeys,
    });

    return NextResponse.json(options);
  } catch (error: any) {
    console.error("[WebAuthn Register Options Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate passkey registration options." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { registrationResponse, device_label } = body;

    if (!registrationResponse) {
      return NextResponse.json(
        { error: "Missing WebAuthn registration response." },
        { status: 400 }
      );
    }

    const verification = await verifyWebAuthnRegistrationResponse(
      session.user.id,
      registrationResponse
    );

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Passkey verification failed." },
        { status: 400 }
      );
    }

    // @simplewebauthn/server v13+: credential fields are nested under `.credential`
    const { credential } = verification.registrationInfo;
    const base64PublicKey = Buffer.from(credential.publicKey).toString("base64");

    const passkey = await prisma.passkey.create({
      data: {
        user_id: session.user.id,
        credential_id: credential.id,
        public_key: base64PublicKey,
        counter: BigInt(credential.counter),
        device_label: device_label || "Passkey Device",
        last_used_at: new Date(),
      },
    });

    return NextResponse.json({
      verified: true,
      passkeyId: passkey.id,
      message: "Passkey registered successfully.",
    });
  } catch (error: any) {
    console.error("[WebAuthn Register Verify Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify and save passkey." },
      { status: 500 }
    );
  }
}
