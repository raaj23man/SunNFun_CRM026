import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { generateSecret, generateSync, verifySync, generateURI } from "otplib";
import QRCode from "qrcode";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { Role, UserStatus } from "@prisma/client";

// ==========================================
// CONFIGURATION & SECRETS
// ==========================================

const JWT_SECRET_STRING =
  process.env.NEXTAUTH_SECRET ||
  "development-secret-key-replace-in-production-1234567890";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export const SESSION_COOKIE_NAME = "sunnfun_crm_session";
const SESSION_EXPIRY = "7d"; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  status: UserStatus;
  organization_id: string;
  team_id?: string | null;
  two_factor_enabled: boolean;
}

export interface SessionPayload {
  user: SessionUser;
  exp?: number;
  iat?: number;
}

// ==========================================
// PASSWORD SECURITY (BCRYPT)
// ==========================================

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ==========================================
// JWT SESSION COOKIES (HTTPONLY / SECURE)
// ==========================================

export async function signSessionJWT(user: SessionUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifySessionJWT(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<string> {
  const token = await signSessionJWT(user);
  const cookieStore = cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  return token;
}

export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionJWT(token);
}

// ==========================================
// 2FA TEMP TOKENS & TOTP
// ==========================================

export interface Temp2FAPayload {
  userId: string;
  email: string;
  organizationId: string;
}

export async function sign2FATempToken(payload: Temp2FAPayload): Promise<string> {
  return new SignJWT({ ...payload, is2faPending: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m") // 10 minutes to complete 2FA challenge
    .sign(JWT_SECRET);
}

export async function verify2FATempToken(
  token: string
): Promise<Temp2FAPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.is2faPending) return null;
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      organizationId: payload.organizationId as string,
    };
  } catch {
    return null;
  }
}

export function generateTOTPSecret(): string {
  return generateSecret();
}

export function generateTOTPKeyURI(
  email: string,
  issuer: string,
  secret: string
): string {
  return generateURI({
    label: email,
    issuer,
    secret,
  });
}

export async function generateTOTPQrCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTOTP(token: string, secret: string): boolean {
  try {
    // verifySync returns a VerifyResult object with a `.valid` boolean
    const result = verifySync({ token, secret });
    return !!(result as any).valid;
  } catch {
    return false;
  }
}

export function generateCurrentTOTPToken(secret: string): string {
  return generateSync({ secret }) as string;
}

// ==========================================
// WEBAUTHN / PASSKEYS
// ==========================================

const RP_NAME = "SunNFun Travel CRM";
export const RP_ID = process.env.NEXTAUTH_URL
  ? new URL(process.env.NEXTAUTH_URL).hostname
  : "localhost";
export const ORIGIN = process.env.NEXTAUTH_URL || "http://localhost:3000";

// In-memory challenge store for WebAuthn challenges (10 min TTL)
const challengeStore = new Map<string, { challenge: string; expires: number }>();

export function setWebAuthnChallenge(key: string, challenge: string): void {
  challengeStore.set(key, { challenge, expires: Date.now() + 10 * 60 * 1000 });
}

export function getWebAuthnChallenge(key: string): string | null {
  const item = challengeStore.get(key);
  if (!item || item.expires < Date.now()) {
    challengeStore.delete(key);
    return null;
  }
  challengeStore.delete(key);
  return item.challenge;
}

export async function createWebAuthnRegistrationOptions(user: {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  existingPasskeys?: { credential_id: string }[];
}) {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: `${user.first_name} ${user.last_name}`,
    attestationType: "none",
    excludeCredentials: (user.existingPasskeys || []).map((passkey) => ({
      id: passkey.credential_id,
      transports: ["internal", "hybrid", "usb", "ble", "nfc"],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  setWebAuthnChallenge(`reg_${user.id}`, options.challenge);
  return options;
}

export async function verifyWebAuthnRegistrationResponse(
  userId: string,
  response: any
): Promise<VerifiedRegistrationResponse> {
  const expectedChallenge = getWebAuthnChallenge(`reg_${userId}`);
  if (!expectedChallenge) {
    throw new Error("Registration challenge expired or not found.");
  }

  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });
}

export async function createWebAuthnAuthenticationOptions(passkeys?: {
  credential_id: string;
}[]) {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    allowCredentials: passkeys?.map((p) => ({
      id: p.credential_id,
      transports: ["internal", "hybrid", "usb", "ble", "nfc"],
    })),
  });

  const sessionChallengeKey = `auth_${options.challenge}`;
  setWebAuthnChallenge(sessionChallengeKey, options.challenge);
  return options;
}

export async function verifyWebAuthnAuthenticationResponse(
  response: any,
  passkey: {
    credential_id: string;
    public_key: string;
    counter: bigint;
  }
): Promise<VerifiedAuthenticationResponse> {
  const expectedChallenge = getWebAuthnChallenge(`auth_${response.challenge}`) || response.challenge;
  
  // @simplewebauthn/server v13+: credential data passed directly, no `authenticator` wrapper
  return verifyAuthenticationResponse({
    response,
    expectedChallenge: (expectedChallenge as string) || "",
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: passkey.credential_id,
      publicKey: Buffer.from(passkey.public_key, "base64"),
      counter: Number(passkey.counter),
    },
  });
}
