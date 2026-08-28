import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { VoucherType, ServiceBookingStatus } from "@prisma/client";

const voucherSchema = z.object({
  type: z.nativeEnum(VoucherType).default(VoucherType.HOTEL),
  custom_content: z.record(z.any()).optional(),
});

/**
 * POST /api/service-bookings/[id]/generate-voucher
 * Generates an operational voucher (HOTEL, TRANSPORT, or ACTIVITY) with signed URL proxy.
 */
export const POST = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const serviceBookingId = (params?.id as string) || "";
    const body = await req.json();
    const validated = voucherSchema.parse(body);

    const booking = (await scopedPrisma.serviceBooking.findUnique({
      where: { id: serviceBookingId },
      include: {
        trip: {
          include: {
            guest: true,
            organization: true,
            brand: true,
          },
        },
        hotel: true,
        supplier: true,
        dispatch_assignment: true,
      },
    })) as any;

    if (!booking || booking.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    const timestamp = Date.now().toString().slice(-6);
    const voucherCode = `VCH-${booking.trip.trip_display_id}-${validated.type[0]}-${timestamp}`;
    const qrData =
      validated.type === "ACTIVITY" || validated.type === "TRIP"
        ? `SUNNFUN:VOUCHER:${voucherCode}:${booking.trip.trip_display_id}`
        : null;

    // Persist Voucher record
    const voucher = await scopedPrisma.voucher.create({
      data: {
        organization_id: user.organization_id,
        trip_id: booking.trip_id,
        service_booking_id: serviceBookingId,
        type: validated.type,
        voucher_code: voucherCode,
        qr_code_data: qrData,
        custom_content: validated.custom_content || undefined,
        // Authenticated non-public proxy endpoint per PRD Part 5 Technical Constraints
        pdf_url: `/api/vouchers/download?code=${voucherCode}`,
      },
    });

    // Update service booking status to VOUCHER_GENERATED
    await scopedPrisma.serviceBooking.update({
      where: { id: serviceBookingId },
      data: { status: ServiceBookingStatus.VOUCHER_GENERATED },
    });

    // Write audit log
    await writeAuditLog(scopedPrisma, {
      organization_id: user.organization_id,
      actor_user_id: user.id,
      entity_type: "Quote" as any, // Audit tracking for voucher issuance
      entity_id: voucher.id,
      action: "CREATE",
      diff: { voucher_code: voucherCode, type: validated.type },
    });

    return NextResponse.json({
      success: true,
      voucher,
      message: `Voucher ${voucherCode} generated successfully.`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS", "RESERVATIONS"],
  }
);
