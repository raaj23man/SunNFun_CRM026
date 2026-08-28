import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";

const bankAccountSchema = z.object({
  bank_name: z.string().min(1, "Bank name is required"),
  account_number: z.string().min(1, "Account number is required"),
  swift_code: z.string().nullable().optional(),
  currency: z.string().default("USD"),
});

/**
 * POST /api/org/bank-account
 * Create a new bank account for the organization.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = bankAccountSchema.parse(body);

    const bankAccount = await scopedPrisma.bankAccount.create({
      data: {
        organization_id: user.organization_id,
        ...validated,
      },
    });

    return NextResponse.json(
      {
        success: true,
        bankAccount,
        message: "Bank account added successfully.",
      },
      { status: 201 }
    );
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  }
);
