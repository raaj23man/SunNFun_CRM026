import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { addDays, subDays, endOfMonth, format } from "date-fns";

export type PaymentRuleType =
  | "IMMEDIATE"
  | "BEFORE_SERVICE_DAYS"
  | "AFTER_SERVICE_DAYS"
  | "MONTH_END_PLUS_DAYS";

export interface CalculateDueDateParams {
  rule_type: PaymentRuleType;
  service_date: Date;
  check_in_date?: Date | null;
  check_out_date?: Date | null;
  days_offset?: number;
}

/**
 * Pure dynamic due-date mathematical resolver per PRD Part 5 Technical Constraints.
 */
export function calculatePaymentDueDate({
  rule_type,
  service_date,
  check_in_date,
  check_out_date,
  days_offset = 0,
}: CalculateDueDateParams): Date {
  const effectiveStart = check_in_date || service_date;
  const effectiveEnd = check_out_date || service_date;

  switch (rule_type) {
    case "IMMEDIATE":
      return new Date();

    case "BEFORE_SERVICE_DAYS":
      return subDays(effectiveStart, Math.max(0, days_offset));

    case "AFTER_SERVICE_DAYS":
      return addDays(effectiveEnd, Math.max(0, days_offset));

    case "MONTH_END_PLUS_DAYS": {
      const monthEnd = endOfMonth(effectiveEnd);
      return addDays(monthEnd, Math.max(0, days_offset));
    }

    default:
      return effectiveStart;
  }
}

const applyRuleSchema = z.object({
  rule_type: z.enum(["IMMEDIATE", "BEFORE_SERVICE_DAYS", "AFTER_SERVICE_DAYS", "MONTH_END_PLUS_DAYS"]),
  days_offset: z.number().int().nonnegative().default(0),
  commit: z.boolean().default(true), // If false, returns calculation preview only
});

/**
 * POST /api/service-bookings/[id]/apply-payment-rule
 * Computes exact payment due date before save (or saves it when commit: true).
 */
export const POST = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const bookingId = (params?.id as string) || "";
    const body = await req.json();
    const validated = applyRuleSchema.parse(body);

    const booking = await scopedPrisma.serviceBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    const calculatedDueDate = calculatePaymentDueDate({
      rule_type: validated.rule_type,
      service_date: booking.service_date,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      days_offset: validated.days_offset,
    });

    const formattedDueDate = format(calculatedDueDate, "dd MMM yyyy");

    if (!validated.commit) {
      // Return calculation preview for UI modal
      return NextResponse.json({
        preview: true,
        rule_type: validated.rule_type,
        days_offset: validated.days_offset,
        calculated_due_date: calculatedDueDate.toISOString(),
        formatted_due_date: formattedDueDate,
      });
    }

    // Save to database
    const updated = await scopedPrisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        payment_due_date: calculatedDueDate,
      },
    });

    await writeAuditLog(scopedPrisma, {
      organization_id: user.organization_id,
      actor_user_id: user.id,
      entity_type: "ServiceBooking" as any,
      entity_id: bookingId,
      action: "UPDATE",
      diff: { action: "SET_PAYMENT_PREFERENCE", payment_due_date: calculatedDueDate },
    });

    return NextResponse.json({
      success: true,
      booking: updated,
      calculated_due_date: calculatedDueDate.toISOString(),
      formatted_due_date: formattedDueDate,
      message: `Payment preference applied: Due on ${formattedDueDate}`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS", "RESERVATIONS", "ACCOUNTANT"],
  }
);
