import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { formatWhatsAppShareText, formatEmailHtml, ShareQuoteData, ShareToggles } from "@/lib/share-formatter";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

/**
 * POST /api/quotes/:id/share
 * Generates formatted WhatsApp text (with wa.me URL) and Email HTML per the 4 toggles.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const quoteId = params?.id as string;

    if (!quoteId) {
      throw new BadRequestError("Quote ID parameter is required.");
    }

    const body = await req.json().catch(() => ({}));
    const toggles: ShareToggles = body.toggles || {};

    const quote = await scopedPrisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        trip: {
          include: {
            guest: true,
            destination: true,
            brand: true,
          },
        },
        flight_segments: true,
        options: {
          include: {
            days: {
              include: { items: true },
              orderBy: { day_number: "asc" },
            },
          },
          orderBy: { created_at: "asc" },
        },
      },
    });

    if (!quote) {
      throw new NotFoundError("Quote not found.");
    }

    const shareData: ShareQuoteData = {
      tripDisplayId: quote.trip.trip_display_id,
      guestName: quote.trip.guest.full_name,
      destinationName: quote.trip.destination?.name || "Custom Destination",
      durationNights: quote.trip.duration_nights,
      durationDays: quote.trip.duration_days,
      startDate: quote.trip.start_date.toISOString(),
      paxAdults: quote.trip.pax_adults,
      paxChildren: quote.trip.pax_children,
      currency: quote.currency,
      totalSellingPrice: Number(quote.total_selling_price),
      pricingStrategy: quote.pricing_strategy,
      options: quote.options.map((opt) => ({
        optionLabel: opt.option_label,
        isDefault: opt.is_default,
        totalSellingPrice: Number(opt.total_selling_price),
        days: opt.days.map((d) => ({
          dayNumber: d.day_number,
          title: d.title,
          description: d.description,
          items: d.items.map((i) => ({
            itemType: i.item_type,
            name: i.custom_name || "Custom Service",
            isFoc: i.is_foc,
          })),
        })),
      })),
      flightSegments: quote.flight_segments
        .filter((f) => f.cost_price !== null && f.selling_price !== null)
        .map((f) => ({
          airline: f.airline,
          flightNumber: f.flight_number,
          originAirport: f.origin_airport,
          destinationAirport: f.destination_airport,
          departureTime: f.departure_time.toISOString(),
          arrivalTime: f.arrival_time.toISOString(),
        })),
    };

    const whatsappText = formatWhatsAppShareText(shareData, toggles);
    const emailHtml = formatEmailHtml(
      shareData,
      toggles,
      quote.trip.brand?.name || "SunNFun Holidays"
    );

    const guestPhone = quote.trip.guest.phone_number.replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/${guestPhone}?text=${encodeURIComponent(whatsappText)}`;

    return NextResponse.json({
      success: true,
      whatsappText,
      whatsappUrl,
      emailHtml,
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
    ],
  }
);
