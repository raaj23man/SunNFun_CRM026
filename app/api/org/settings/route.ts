import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { NotFoundError } from "@/lib/api-error";

const updateOrgSettingsSchema = z.object({
  company_name: z.string().min(1, "Company name is required").optional(),
  brand_short_name: z.string().min(1, "Brand short name is required").optional(),
  support_contact_number: z.string().min(1, "Support contact number is required").optional(),
  brand_color_theme: z.string().nullable().optional(),
  trip_prefix: z.string().min(1, "Trip prefix is required").optional(),
  default_timezone: z.string().min(1, "Timezone is required").optional(),
  force_2fa: z.boolean().optional(),
});

/**
 * GET /api/org/settings
 * Super Admin & Admin: Retrieve org settings, brands, billing addresses, and bank accounts.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const org = await scopedPrisma.organization.findUnique({
      where: { id: user.organization_id },
      include: {
        brands: { orderBy: { created_at: "asc" } },
        billing_addresses: { orderBy: { is_primary: "desc" } },
        bank_accounts: { orderBy: { created_at: "asc" } },
      },
    });

    if (!org) {
      throw new NotFoundError("Organization not found.");
    }

    return NextResponse.json({
      organization: org,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  }
);

/**
 * PUT /api/org/settings
 * Super Admin & Admin: Update core organization settings.
 */
export const PUT = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = updateOrgSettingsSchema.parse(body);

    const updatedOrg = await scopedPrisma.organization.update({
      where: { id: user.organization_id },
      data: validated,
      include: {
        brands: true,
        billing_addresses: true,
        bank_accounts: true,
      },
    });

    // TODO: PRD Part 8 AuditLog write on mutation:
    // await scopedPrisma.auditLog.create({ ... })

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      message: "Organization settings updated successfully.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
  }
);
