import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { ServiceBookingStatus } from "@prisma/client";
import { format } from "date-fns";

/**
 * POST /api/service-bookings/[id]/send-enquiry
 * Auto-generates a unified-subject-line hotel/supplier enquiry draft with pre-filled
 * guest details, dates, room counts, and meal plan.
 * Matches Sembark's 1-minute supplier reply workflow.
 */
export const POST = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const bookingId = (params?.id as string) || "";

    const booking = (await scopedPrisma.serviceBooking.findUnique({
      where: { id: bookingId },
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
      },
    })) as any;

    if (!booking || booking.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    const brandName = booking.trip?.brand?.name || booking.trip?.organization?.company_name || "SunNFun Holidays";
    const tripDisplayId = booking.trip?.trip_display_id || "TRIP";
    const guestName = booking.trip?.guest?.full_name || "Guest";
    const checkInStr = booking.check_in_date
      ? format(new Date(booking.check_in_date), "dd MMM yyyy")
      : format(new Date(booking.service_date), "dd MMM yyyy");
    const checkOutStr = booking.check_out_date
      ? format(new Date(booking.check_out_date), "dd MMM yyyy")
      : "Same Day";
    const roomCount = booking.room_count;
    const paxCount = booking.pax_count;
    const mealPlan = booking.meal_plan || "CP";
    const hotelName = booking.hotel?.name || booking.service_name;
    const supplierContact = booking.supplier?.email || booking.supplier?.phone || "Hotel Reservations";

    // 1. Sembark Unified Email Subject Line
    const emailSubject = `[Booking Enquiry] ${tripDisplayId} - ${guestName} - ${roomCount} Room(s) (${checkInStr} to ${checkOutStr}) - ${brandName}`;

    // 2. Email Body HTML
    const emailBodyHtml = `
<div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; line-height: 1.6;">
  <p>Dear <strong>${hotelName} Reservations</strong>,</p>
  <p>Greetings from <strong>${brandName}</strong>!</p>
  <p>Please check availability and confirm booking for our esteemed guest with the following details:</p>
  
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px; font-weight: bold; width: 40%;">Query / File Ref:</td>
      <td style="padding: 8px; font-family: monospace; font-weight: bold;">${tripDisplayId}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px; font-weight: bold;">Guest Name:</td>
      <td style="padding: 8px;">${guestName}</td>
    </tr>
    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px; font-weight: bold;">Check-In Date:</td>
      <td style="padding: 8px;">${checkInStr}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px; font-weight: bold;">Check-Out Date:</td>
      <td style="padding: 8px;">${checkOutStr}</td>
    </tr>
    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px; font-weight: bold;">Rooms / Units:</td>
      <td style="padding: 8px;">${roomCount} Room(s)</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px; font-weight: bold;">Total Guests:</td>
      <td style="padding: 8px;">${paxCount} Adult(s)</td>
    </tr>
    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px; font-weight: bold;">Meal Plan:</td>
      <td style="padding: 8px; font-weight: bold; color: #059669;">${mealPlan}</td>
    </tr>
  </table>

  <p>Kindly reply with confirmation and your reservation reference number at your earliest convenience.</p>
  <p>Best regards,<br><strong>Operations &amp; Reservations Team</strong><br>${brandName}</p>
</div>
`;

    // 3. WhatsApp Formatted Text
    const whatsappText = `*BOOKING ENQUIRY* — *${brandName}*
*Ref:* ${tripDisplayId}
*Hotel / Service:* ${hotelName}
*Guest:* ${guestName} (${paxCount} Pax)
*Check-In:* ${checkInStr}
*Check-Out:* ${checkOutStr}
*Rooms:* ${roomCount} (${mealPlan})

_Please confirm availability and share your reservation confirmation reference._`;

    // 4. Update status to ENQUIRY_SENT
    const updated = await scopedPrisma.serviceBooking.update({
      where: { id: bookingId },
      data: { status: ServiceBookingStatus.ENQUIRY_SENT },
    });

    // Write audit log
    await writeAuditLog(scopedPrisma, {
      organization_id: user.organization_id,
      actor_user_id: user.id,
      entity_type: "ServiceBooking" as any,
      entity_id: bookingId,
      action: "STATUS_CHANGE",
      diff: { status: "ENQUIRY_SENT", subject: emailSubject },
    });

    return NextResponse.json({
      success: true,
      booking: updated,
      enquiry_payload: {
        supplier_contact: supplierContact,
        email_subject: emailSubject,
        email_body_html: emailBodyHtml,
        whatsapp_text: whatsappText,
      },
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "OPERATIONS", "RESERVATIONS"],
  }
);
