import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { computeQuotePricing } from "@/lib/quote-pricing";
import { BadRequestError, NotFoundError } from "@/lib/api-error";

/**
 * GET /api/quotes/:id
 * Retrieves a full Quote with all Options, Days, Items, Flight Segments, and Tax Rates.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const quoteId = params?.id as string;

    if (!quoteId) {
      throw new BadRequestError("Quote ID parameter is required.");
    }

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
        overall_tax_rate: true,
        flight_segments: true,
        options: {
          include: {
            days: {
              include: {
                items: {
                  include: { tax_rate: true },
                },
              },
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

    return NextResponse.json({ quote });
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
      "DATA_OPERATOR",
    ],
  }
);

/**
 * PUT /api/quotes/:id
 * Saves full quotation payload including updated options, days, items, and pricing settings.
 * Automatically recalculates and synchronizes pricing totals via computeQuotePricing.
 */
export const PUT = withAuthAndRbac(
  async (req, { user, scopedPrisma, params }) => {
    const quoteId = params?.id as string;

    if (!quoteId) {
      throw new BadRequestError("Quote ID parameter is required.");
    }

    const body = await req.json();

    // 1. Verify Quote exists
    const existingQuote = await scopedPrisma.quote.findUnique({
      where: { id: quoteId },
      include: { options: { include: { days: { include: { items: true } } } } },
    });

    if (!existingQuote) {
      throw new NotFoundError("Quote not found.");
    }

    // 2. Update Quote top-level fields
    await scopedPrisma.quote.update({
      where: { id: quoteId },
      data: {
        pricing_strategy: body.pricing_strategy || existingQuote.pricing_strategy,
        overall_markup_type: body.overall_markup_type ?? existingQuote.overall_markup_type,
        overall_markup_value: body.overall_markup_value !== undefined ? body.overall_markup_value : existingQuote.overall_markup_value,
        overall_tax_rate_id: body.overall_tax_rate_id ?? existingQuote.overall_tax_rate_id,
        is_multi_option: body.is_multi_option ?? existingQuote.is_multi_option,
        hide_total_price: body.hide_total_price ?? existingQuote.hide_total_price,
        include_itinerary: body.include_itinerary ?? existingQuote.include_itinerary,
        remove_terms: body.remove_terms ?? existingQuote.remove_terms,
        use_similar_hotel_wording: body.use_similar_hotel_wording ?? existingQuote.use_similar_hotel_wording,
      },
    });

    // 3. Synchronize Options, Days & Items if provided
    if (body.options && Array.isArray(body.options)) {
      for (const opt of body.options) {
        let optionId = opt.id;

        if (!optionId || optionId.startsWith("temp-")) {
          // Create new option
          const createdOpt = await scopedPrisma.quoteOption.create({
            data: {
              quote_id: quoteId,
              option_label: opt.option_label || "Option",
              is_default: !!opt.is_default,
            },
          });
          optionId = createdOpt.id;
        } else {
          // Update existing option
          await scopedPrisma.quoteOption.update({
            where: { id: optionId },
            data: {
              option_label: opt.option_label,
              is_default: !!opt.is_default,
            },
          });
        }

        if (opt.days && Array.isArray(opt.days)) {
          for (const day of opt.days) {
            let dayId = day.id;

            if (!dayId || dayId.startsWith("temp-")) {
              const createdDay = await scopedPrisma.quoteDay.create({
                data: {
                  quote_option_id: optionId,
                  day_number: day.day_number || 1,
                  title: day.title || `Day ${day.day_number}`,
                  description: day.description || "",
                },
              });
              dayId = createdDay.id;
            } else {
              await scopedPrisma.quoteDay.update({
                where: { id: dayId },
                data: {
                  day_number: day.day_number,
                  title: day.title,
                  description: day.description,
                },
              });
            }

            // Sync items for this day
            if (day.items && Array.isArray(day.items)) {
              // Delete existing items not in payload
              const keepItemIds = day.items.map((i: any) => i.id).filter((id: string) => id && !id.startsWith("temp-"));
              await scopedPrisma.quoteItem.deleteMany({
                where: {
                  quote_day_id: dayId,
                  id: { notIn: keepItemIds },
                },
              });

              for (const item of day.items) {
                if (!item.id || item.id.startsWith("temp-")) {
                  await scopedPrisma.quoteItem.create({
                    data: {
                      quote_day_id: dayId,
                      item_type: item.item_type || "CUSTOM",
                      inventory_id: item.inventory_id || null,
                      custom_name: item.custom_name || "",
                      cost_price: Number(item.cost_price) || 0,
                      selling_price: Number(item.selling_price) || 0,
                      is_foc: !!item.is_foc,
                      markup_type: item.markup_type || null,
                      markup_value: item.markup_value !== undefined ? Number(item.markup_value) : null,
                      tax_basis: item.tax_basis || null,
                      tax_rate_id: item.tax_rate_id || null,
                      pickup_location: item.pickup_location || null,
                      drop_location: item.drop_location || null,
                    },
                  });
                } else {
                  await scopedPrisma.quoteItem.update({
                    where: { id: item.id },
                    data: {
                      item_type: item.item_type,
                      inventory_id: item.inventory_id || null,
                      custom_name: item.custom_name,
                      cost_price: Number(item.cost_price) || 0,
                      selling_price: Number(item.selling_price) || 0,
                      is_foc: !!item.is_foc,
                      markup_type: item.markup_type || null,
                      markup_value: item.markup_value !== undefined ? Number(item.markup_value) : null,
                      tax_basis: item.tax_basis || null,
                      tax_rate_id: item.tax_rate_id || null,
                      pickup_location: item.pickup_location || null,
                      drop_location: item.drop_location || null,
                    },
                  });
                }
              }
            }
          }
        }
      }
    }

    // 4. Recalculate Quote Pricing using pure pricing engine
    const pricingSummary = await computeQuotePricing(quoteId, scopedPrisma);

    // 5. Fetch and return fully updated Quote
    const updatedQuote = await scopedPrisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        trip: { include: { guest: true, destination: true, brand: true } },
        overall_tax_rate: true,
        flight_segments: true,
        options: {
          include: {
            days: {
              include: { items: { include: { tax_rate: true } } },
              orderBy: { day_number: "asc" },
            },
          },
          orderBy: { created_at: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
      pricing: pricingSummary,
      message: "Quote saved and recalculated successfully.",
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON"],
  }
);
