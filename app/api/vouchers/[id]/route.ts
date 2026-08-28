import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";

const updateVoucherSchema = z.object({
  custom_content: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/vouchers/[id]
 */
export const GET = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const voucherId = (params?.id as string) || "";

    const voucher = await scopedPrisma.voucher.findUnique({
      where: { id: voucherId },
      include: {
        trip: { include: { guest: true } },
        service_booking: {
          include: {
            hotel: true,
            supplier: true,
            dispatch_assignment: true,
          },
        },
      },
    });

    if (!voucher || voucher.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    return NextResponse.json({ voucher });
  },
  {
    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_HEAD",
      "SALES_PERSON",
      "OPERATIONS",
      "RESERVATIONS",
      "ACCOUNTANT",
    ],
  }
);

/**
 * PUT /api/vouchers/[id]
 * Updates voucher content post-generation and marks is_edited_after_generation = true.
 */
export const PUT = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const voucherId = (params?.id as string) || "";
    const body = await req.json();
    const validated = updateVoucherSchema.parse(body);

    const existing = await scopedPrisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!existing || existing.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    const updated = await scopedPrisma.voucher.update({
      where: { id: voucherId },
      data: {
        custom_content: (validated.custom_content as any) || undefined,
        is_edited_after_generation: true, // Tracked per Sembark spec
      },
    });

    await writeAuditLog(scopedPrisma, {
      organization_id: user.organization_id,
      actor_user_id: user.id,
      entity_type: "Quote" as any,
      entity_id: voucherId,
      action: "UPDATE",
      diff: { action: "VOUCHER_EDITED_AFTER_GENERATION", is_edited: true },
    });

    return NextResponse.json({
      success: true,
      voucher: updated,
      message: "Voucher updated and tracked as modified post-generation.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS", "RESERVATIONS"],
  }
);
