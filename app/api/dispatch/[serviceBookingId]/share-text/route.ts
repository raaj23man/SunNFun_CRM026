import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { format } from "date-fns";

/**
 * Generates audience-appropriate dispatch share text strictly adhering to PRD Part 5:
 * - Driver text: passenger details, pickup/drop, itinerary highlights. STRICTLY ZERO CLIENT PRICING.
 * - Guest text: vehicle details, driver name/phone, pickup time. STRICTLY ZERO SUPPLIER COST.
 * - Provider text: supplier confirmation format.
 */
export function generateDispatchAudienceText({
  audience,
  booking,
  dispatch,
  brandName,
}: {
  audience: "guest" | "driver" | "provider";
  booking: any;
  dispatch: any;
  brandName: string;
}) {
  const tripDisplayId = booking.trip?.trip_display_id || "TRIP";
  const guestName = booking.trip?.guest?.full_name || "Guest";
  const guestPhone = booking.trip?.guest?.phone_number || "Not provided";
  const serviceDateStr = booking.service_date
    ? format(new Date(booking.service_date), "dd MMM yyyy")
    : "Scheduled Date";
  const pickupTimeStr = dispatch?.pickup_time
    ? format(new Date(dispatch.pickup_time), "hh:mm a")
    : "As per schedule";
  const pickupLoc = dispatch?.pickup_location || "Designated Pickup Point";
  const dropLoc = dispatch?.drop_location || "Designated Drop Point";
  const driverName = dispatch?.driver_name || "Assigned Chauffeur";
  const driverPhone = dispatch?.driver_phone || "Contact Ops";
  const cabType = dispatch?.cab_type || booking.service_name;
  const vehicleNumber = dispatch?.vehicle_number || "Assigned on arrival";

  if (audience === "guest") {
    return `*🚗 Vehicle & Driver Details — ${brandName}*
*Trip Ref:* ${tripDisplayId}
*Date:* ${serviceDateStr}
*Pickup Time:* ${pickupTimeStr}
*Pickup Location:* ${pickupLoc}
*Destination:* ${dropLoc}

*Vehicle:* ${cabType} (${vehicleNumber})
*Driver:* ${driverName}
*Driver Contact:* ${driverPhone}

_Have a pleasant and comfortable journey! For any immediate assistance, please reach out to your trip coordinator._`;
  }

  if (audience === "driver") {
    return `*📋 Duty Assignment — ${brandName}*
*File Ref:* ${tripDisplayId}
*Date:* ${serviceDateStr}
*Reporting Time:* ${pickupTimeStr}
*Pickup:* ${pickupLoc}
*Drop:* ${dropLoc}

*Passenger Name:* ${guestName} (${booking.pax_count || 2} Pax)
*Passenger Phone:* ${guestPhone}
*Vehicle Assigned:* ${vehicleNumber} (${cabType})
${dispatch?.notes ? `*Special Notes:* ${dispatch.notes}\n` : ""}
_Please ensure vehicle cleanliness and report 15 minutes before the pickup time._`;
  }

  // Provider (Audience === "provider")
  return `*📝 Service Order Confirmation — ${brandName}*
*Booking Ref:* ${tripDisplayId}
*Service:* ${booking.service_name}
*Date:* ${serviceDateStr}
*Passenger:* ${guestName} (${booking.pax_count || 2} Pax)
*Vehicle:* ${cabType}
*Status:* ${booking.status}
${booking.supplier_confirmation_number ? `*Confirmation Ref:* ${booking.supplier_confirmation_number}\n` : ""}
_Thank you for your valued partnership._`;
}

/**
 * GET /api/dispatch/[serviceBookingId]/share-text?audience=guest|driver|provider
 */
export const GET = withAuthAndRbac(
  async (req, { params, user, scopedPrisma }) => {
    const serviceBookingId = (params?.serviceBookingId as string) || "";
    const { searchParams } = new URL(req.url);
    const audience = (searchParams.get("audience") || "guest") as "guest" | "driver" | "provider";

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
        dispatch_assignment: true,
      },
    })) as any;

    if (!booking || booking.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Service booking not found" }, { status: 404 });
    }

    const brandName = booking.trip?.brand?.name || booking.trip?.organization?.company_name || "SunNFun Holidays";
    const shareText = generateDispatchAudienceText({
      audience,
      booking,
      dispatch: booking.dispatch_assignment,
      brandName,
    });

    const targetPhone =
      audience === "guest"
        ? booking.trip?.guest?.phone_number?.replace(/[^0-9]/g, "")
        : audience === "driver"
        ? booking.dispatch_assignment?.driver_phone?.replace(/[^0-9]/g, "")
        : "";

    const whatsappUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(shareText)}`
      : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    return NextResponse.json({
      audience,
      share_text: shareText,
      whatsapp_url: whatsappUrl,
    });
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
