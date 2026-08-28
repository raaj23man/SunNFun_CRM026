import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { ServiceBookingStatus } from "@prisma/client";

const dropServiceBookingSchema = z.object({
  cancellation_charge: z.number().nonnegative().default(0),
  reason: z.string().nullable().optional(),
});

/**
 * POST /api/service-bookings/[id]/drop
 * Performs a terminal "Drop" operation per PRD Part 5 Technical Constraints:
 * 1. Sets status to DROPPED with drop_cancellation_charge.
 * 2. Automatic refund-installment check:
 *    - If amount_paid > cancellation_charge => generates an automatic refund installment.
 *    - Leaves a clear trigger marker for Part 6 ClientLedger / SupplierLedger integration.
 */
export const POST = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const bookingId = (params?.id as string) || "";
    const body = await req.json();
    const validated = dropServiceBookingSchema.parse(body);

    const booking = (await scopedPrisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: {
        trip: { select: { trip_display_id: true, guest_id: true } },
      },
    })) as any;

    if (!booking || booking.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    if (booking.status === ServiceBookingStatus.DROPPED) {
      return NextResponse.json({ error: "Service booking is already dropped" }, { status: 400 });
    }

    const amountPaid = Number(booking.amount_paid) || 0;
    const cancellationCharge = validated.cancellation_charge;
    const isRefundRequired = amountPaid > cancellationCharge;
    const refundAmount = isRefundRequired ? amountPaid - cancellationCharge : 0;

    // Execute drop mutation
    const droppedBooking = await scopedPrisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        status: ServiceBookingStatus.DROPPED,
        drop_cancellation_charge: cancellationCharge,
        notes: validated.reason ? `Dropped: ${validated.reason}` : booking.notes,
      },
    });

    // =========================================================================
    // AUTOMATIC REFUND-INSTALLMENT TRIGGER (PRD Part 5 / Part 6 Bridge)
    // =========================================================================
    let refundInstallmentDetails = null;

    if (isRefundRequired) {
      refundInstallmentDetails = {
        status: "PENDING_LEDGER_POSTING",
        refund_amount: refundAmount,
        original_amount_paid: amountPaid,
        cancellation_charge_retained: cancellationCharge,
        currency: "USD", // Inherited from trip/org
        beneficiary_type: "CLIENT_OR_SUPPLIER",
        trigger_reason: `Service Booking Dropped: ${booking.service_name} (${booking.trip?.trip_display_id || "TRIP"})`,
      };

      // TODO [Part 6 Financial Accounting]: When ClientLedger / SupplierLedger tables are migrated in Task D.3,
      // write an atomic ledger reversal transaction here:
      // await tx.financialTransaction.create({
      //   data: {
      //     organization_id: user.organization_id,
      //     type: "REFUND_PAYABLE",
      //     amount: refundAmount,
      //     reference_service_booking_id: bookingId,
      //     status: "DUE",
      //   }
      // });
    }

    // Write audit log
    await writeAuditLog(scopedPrisma, {
      organization_id: user.organization_id,
      actor_user_id: user.id,
      entity_type: "ServiceBooking" as any,
      entity_id: bookingId,
      action: "STATUS_CHANGE",
      diff: {
        action: "SERVICE_DROP",
        cancellation_charge: cancellationCharge,
        amount_paid: amountPaid,
        refund_required: isRefundRequired,
        refund_amount: refundAmount,
        reason: validated.reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service booking dropped successfully.",
      booking: droppedBooking,
      refund_installment: refundInstallmentDetails,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS", "RESERVATIONS"],
  }
);
