import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import crypto from "crypto";
import { withAuthAndRbac } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { BadRequestError } from "@/lib/api-error";
import prisma from "@/lib/prisma";

const inviteUserSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email address is required"),
  phone_number: z.string().nullable().optional(),
  role: z.nativeEnum(Role).default(Role.SALES_PERSON),
  team_id: z.string().nullable().optional(),
});

/**
 * POST /api/users/invite
 * Invite / create a new user for the organization with a generated temporary password.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = inviteUserSchema.parse(body);
    const normalizedEmail = validated.email.toLowerCase().trim();

    // Check if email already exists globally
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new BadRequestError("A user with this email address already exists.");
    }

    // Generate random 12-character temporary password
    const tempPassword = `Temp@${crypto.randomBytes(4).toString("hex")}`;
    const passwordHash = await hashPassword(tempPassword);

    // Verify team exists in this org if team_id provided
    if (validated.team_id) {
      const team = await scopedPrisma.team.findUnique({
        where: { id: validated.team_id },
      });
      if (!team) {
        throw new BadRequestError("Specified team does not exist in your organization.");
      }
    }

    const newUser = await scopedPrisma.user.create({
      data: {
        organization_id: user.organization_id,
        first_name: validated.first_name,
        last_name: validated.last_name,
        email: normalizedEmail,
        phone_number: validated.phone_number,
        role: validated.role,
        team_id: validated.team_id,
        password_hash: passwordHash,
        status: "ACTIVE",
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
        team_id: true,
      },
    });

    // TODO: Send invitation email with temporary login credentials via Resend (PRD Part 7 / Automations)

    return NextResponse.json(
      {
        success: true,
        user: newUser,
        temporaryPassword: tempPassword,
        message: "User successfully invited. Please provide the temporary password to the member.",
      },
      { status: 201 }
    );
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  }
);
