import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";

const billingAddressSchema = z.object({
  label: z.string().min(1, "Label is required (e.g., Head Office)"),
  address_text: z.string().min(1, "Address text is required"),
  contact_number: z.string().min(1, "Contact number is required"),
  billing_details: z.string().nullable().optional(),
  is_primary: z.boolean().default(false),
  destination_id: z.string().nullable().optional(),
});

/**
 * POST /api/org/billing-address
 * Create a new billing address for the organization.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = billingAddressSchema.parse(body);

    // If marked as primary, reset other addresses for this org
    if (validated.is_primary) {
      await scopedPrisma.billingAddress.updateMany({
        where: { organization_id: user.organization_id },
        data: { is_primary: false },
      });
    }

    const billingAddress = await scopedPrisma.billingAddress.create({
      data: {
        organization_id: user.organization_id,
        ...validated,
      },
    });

    return NextResponse.json(
      {
        success: true,
        billingAddress,
        message: "Billing address created successfully.",
      },
      { status: 201 }
    );
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  }
);
