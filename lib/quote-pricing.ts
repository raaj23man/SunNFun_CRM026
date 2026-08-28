/**
 * Quotation Pricing Calculation Engine (PRD Part 4)
 * Pure functions implementing Sembark's exact 4 pricing strategies:
 * 1. OVERALL
 * 2. PER_PERSON
 * 3. PER_COMPONENT
 * 4. PER_COMPONENT_PER_PERSON
 *
 * CRITICAL FINANCIAL ACCURACY RULE:
 * Rounding must happen once at the end, not at each intermediate step!
 */

export type PricingStrategy =
  | "OVERALL"
  | "PER_PERSON"
  | "PER_COMPONENT"
  | "PER_COMPONENT_PER_PERSON";

export type MarkupType = "PERCENT" | "FLAT";
export type TaxBasis = "COST_PLUS_MARKUP" | "MARKUP_ONLY";

export interface TaxRateInput {
  id?: string;
  name: string;
  rate_percent: number;
  is_inclusive?: boolean;
}

export interface FlightSegmentInput {
  id?: string;
  airline: string;
  flight_number: string;
  cost_price?: number | null;
  selling_price?: number | null;
}

export interface QuoteItemInput {
  id?: string;
  custom_name?: string | null;
  cost_price: number;
  selling_price?: number;
  is_foc?: boolean;
  markup_type?: MarkupType | null;
  markup_value?: number | null;
  tax_basis?: TaxBasis | null;
  tax_rate?: TaxRateInput | null;
}

export interface QuoteDayInput {
  id?: string;
  day_number: number;
  title: string;
  items: QuoteItemInput[];
}

export interface QuoteOptionInput {
  id?: string;
  option_label: string;
  is_default?: boolean;
  days: QuoteDayInput[];
}

export interface QuotePricingInput {
  id?: string;
  pax_adults: number;
  pax_children?: number;
  pricing_strategy: PricingStrategy;
  overall_markup_type?: MarkupType | null;
  overall_markup_value?: number | null;
  overall_tax_rate?: TaxRateInput | null;
  options: QuoteOptionInput[];
  flight_segments?: FlightSegmentInput[];
}

export interface CalculatedQuoteItem {
  id?: string;
  custom_name?: string | null;
  cost_price: number;
  selling_price: number;
  markup_amount: number;
  tax_amount: number;
  is_foc: boolean;
}

export interface CalculatedQuoteOption {
  id?: string;
  option_label: string;
  is_default: boolean;
  total_cost_price: number;
  total_selling_price: number;
  items_cost_price: number;
  items_selling_price: number;
  margin_amount: number;
  margin_percentage: number;
  calculated_items: CalculatedQuoteItem[];
}

export interface CalculatedQuotePricingResult {
  pricing_strategy: PricingStrategy;
  total_pax: number;
  valid_flight_segments: Array<{
    airline: string;
    flight_number: string;
    cost_price: number;
    selling_price: number;
  }>;
  total_flight_cost: number;
  total_flight_selling: number;
  options: CalculatedQuoteOption[];
  default_option: CalculatedQuoteOption | null;
}

/**
 * Helper to round once to 2 decimal places at the final step.
 */
export function roundToCent(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Validates flight segments per Sembark documented rules:
 * A flight segment must have BOTH cost_price and selling_price non-null and defined to appear.
 */
export function filterValidFlightSegments(flights?: FlightSegmentInput[]): Array<{
  airline: string;
  flight_number: string;
  cost_price: number;
  selling_price: number;
}> {
  if (!flights || flights.length === 0) return [];

  return flights
    .filter((f) => f.cost_price !== null && f.cost_price !== undefined && f.selling_price !== null && f.selling_price !== undefined)
    .map((f) => ({
      airline: f.airline,
      flight_number: f.flight_number,
      cost_price: Number(f.cost_price),
      selling_price: Number(f.selling_price),
    }));
}

/**
 * Pure calculation function for Quote Pricing across all 4 strategies.
 */
export function calculateQuotePricing(input: QuotePricingInput): CalculatedQuotePricingResult {
  const pax = Math.max(1, (input.pax_adults || 0) + (input.pax_children || 0));
  const validFlights = filterValidFlightSegments(input.flight_segments);

  const rawFlightCost = validFlights.reduce((acc, f) => acc + f.cost_price, 0);
  const rawFlightSelling = validFlights.reduce((acc, f) => acc + f.selling_price, 0);

  const calculatedOptions: CalculatedQuoteOption[] = input.options.map((opt) => {
    const allItems: QuoteItemInput[] = opt.days.flatMap((d) => d.items || []);
    let rawItemsCost = 0;
    let rawItemsSelling = 0;
    const calculatedItems: CalculatedQuoteItem[] = [];

    if (input.pricing_strategy === "OVERALL") {
      // 1. OVERALL STRATEGY
      const nonFocCost = allItems
        .filter((i) => !i.is_foc)
        .reduce((sum, i) => sum + (Number(i.cost_price) || 0), 0);
      const allCost = allItems.reduce((sum, i) => sum + (Number(i.cost_price) || 0), 0);
      rawItemsCost = allCost;

      // Apply overall markup
      let markupAmount = 0;
      if (input.overall_markup_type === "PERCENT") {
        markupAmount = nonFocCost * ((Number(input.overall_markup_value) || 0) / 100);
      } else if (input.overall_markup_type === "FLAT") {
        markupAmount = Number(input.overall_markup_value) || 0;
      }

      const preTaxSelling = nonFocCost + markupAmount;

      // Apply overall tax
      let taxAmount = 0;
      if (input.overall_tax_rate && input.overall_tax_rate.rate_percent > 0) {
        const rate = input.overall_tax_rate.rate_percent;
        if (input.overall_tax_rate.is_inclusive) {
          taxAmount = preTaxSelling * (rate / (100 + rate));
          rawItemsSelling = preTaxSelling;
        } else {
          taxAmount = preTaxSelling * (rate / 100);
          rawItemsSelling = preTaxSelling + taxAmount;
        }
      } else {
        rawItemsSelling = preTaxSelling;
      }

      // Map line items (proportional selling or cost)
      for (const item of allItems) {
        calculatedItems.push({
          id: item.id,
          custom_name: item.custom_name,
          cost_price: roundToCent(Number(item.cost_price) || 0),
          selling_price: item.is_foc ? 0 : roundToCent(Number(item.cost_price) || 0),
          markup_amount: 0,
          tax_amount: 0,
          is_foc: !!item.is_foc,
        });
      }
    } else if (input.pricing_strategy === "PER_PERSON") {
      // 2. PER_PERSON STRATEGY
      const nonFocCost = allItems
        .filter((i) => !i.is_foc)
        .reduce((sum, i) => sum + (Number(i.cost_price) || 0), 0);
      const allCost = allItems.reduce((sum, i) => sum + (Number(i.cost_price) || 0), 0);
      rawItemsCost = allCost;

      const costPerPerson = nonFocCost / pax;

      // Markup per person
      let markupPerPerson = 0;
      if (input.overall_markup_type === "PERCENT") {
        markupPerPerson = costPerPerson * ((Number(input.overall_markup_value) || 0) / 100);
      } else if (input.overall_markup_type === "FLAT") {
        markupPerPerson = Number(input.overall_markup_value) || 0;
      }

      const preTaxPerPerson = costPerPerson + markupPerPerson;

      // Tax per person
      let taxPerPerson = 0;
      let sellingPerPerson = preTaxPerPerson;
      if (input.overall_tax_rate && input.overall_tax_rate.rate_percent > 0) {
        const rate = input.overall_tax_rate.rate_percent;
        if (input.overall_tax_rate.is_inclusive) {
          taxPerPerson = preTaxPerPerson * (rate / (100 + rate));
          sellingPerPerson = preTaxPerPerson;
        } else {
          taxPerPerson = preTaxPerPerson * (rate / 100);
          sellingPerPerson = preTaxPerPerson + taxPerPerson;
        }
      }

      // Re-multiply by pax without intermediate rounding!
      rawItemsSelling = sellingPerPerson * pax;

      for (const item of allItems) {
        calculatedItems.push({
          id: item.id,
          custom_name: item.custom_name,
          cost_price: roundToCent(Number(item.cost_price) || 0),
          selling_price: item.is_foc ? 0 : roundToCent(Number(item.cost_price) || 0),
          markup_amount: 0,
          tax_amount: 0,
          is_foc: !!item.is_foc,
        });
      }
    } else if (input.pricing_strategy === "PER_COMPONENT") {
      // 3. PER_COMPONENT STRATEGY
      for (const item of allItems) {
        const itemCost = Number(item.cost_price) || 0;
        rawItemsCost += itemCost;

        if (item.is_foc) {
          calculatedItems.push({
            id: item.id,
            custom_name: item.custom_name,
            cost_price: roundToCent(itemCost),
            selling_price: 0,
            markup_amount: 0,
            tax_amount: 0,
            is_foc: true,
          });
          continue;
        }

        // Component Markup
        let itemMarkup = 0;
        if (item.markup_type === "PERCENT") {
          itemMarkup = itemCost * ((Number(item.markup_value) || 0) / 100);
        } else if (item.markup_type === "FLAT") {
          itemMarkup = Number(item.markup_value) || 0;
        }

        // Component Tax
        let itemTax = 0;
        let itemSelling = itemCost + itemMarkup;

        if (item.tax_rate && item.tax_rate.rate_percent > 0) {
          const rate = item.tax_rate.rate_percent;
          const taxBase =
            item.tax_basis === "MARKUP_ONLY" ? itemMarkup : itemCost + itemMarkup;

          if (item.tax_rate.is_inclusive) {
            itemTax = (itemCost + itemMarkup) * (rate / (100 + rate));
            itemSelling = itemCost + itemMarkup;
          } else {
            itemTax = taxBase * (rate / 100);
            itemSelling = itemCost + itemMarkup + itemTax;
          }
        }

        rawItemsSelling += itemSelling;

        calculatedItems.push({
          id: item.id,
          custom_name: item.custom_name,
          cost_price: roundToCent(itemCost),
          selling_price: roundToCent(itemSelling),
          markup_amount: roundToCent(itemMarkup),
          tax_amount: roundToCent(itemTax),
          is_foc: false,
        });
      }
    } else if (input.pricing_strategy === "PER_COMPONENT_PER_PERSON") {
      // 4. PER_COMPONENT_PER_PERSON STRATEGY
      for (const item of allItems) {
        const itemCost = Number(item.cost_price) || 0;
        rawItemsCost += itemCost;

        if (item.is_foc) {
          calculatedItems.push({
            id: item.id,
            custom_name: item.custom_name,
            cost_price: roundToCent(itemCost),
            selling_price: 0,
            markup_amount: 0,
            tax_amount: 0,
            is_foc: true,
          });
          continue;
        }

        const costPerPerson = itemCost / pax;

        let markupPerPerson = 0;
        if (item.markup_type === "PERCENT") {
          markupPerPerson = costPerPerson * ((Number(item.markup_value) || 0) / 100);
        } else if (item.markup_type === "FLAT") {
          markupPerPerson = Number(item.markup_value) || 0;
        }

        let taxPerPerson = 0;
        let sellingPerPerson = costPerPerson + markupPerPerson;

        if (item.tax_rate && item.tax_rate.rate_percent > 0) {
          const rate = item.tax_rate.rate_percent;
          const taxBasePerPax =
            item.tax_basis === "MARKUP_ONLY"
              ? markupPerPerson
              : costPerPerson + markupPerPerson;

          if (item.tax_rate.is_inclusive) {
            taxPerPerson = (costPerPerson + markupPerPerson) * (rate / (100 + rate));
            sellingPerPerson = costPerPerson + markupPerPerson;
          } else {
            taxPerPerson = taxBasePerPax * (rate / 100);
            sellingPerPerson = costPerPerson + markupPerPerson + taxPerPerson;
          }
        }

        const itemTotalSelling = sellingPerPerson * pax;
        rawItemsSelling += itemTotalSelling;

        calculatedItems.push({
          id: item.id,
          custom_name: item.custom_name,
          cost_price: roundToCent(itemCost),
          selling_price: roundToCent(itemTotalSelling),
          markup_amount: roundToCent(markupPerPerson * pax),
          tax_amount: roundToCent(taxPerPerson * pax),
          is_foc: false,
        });
      }
    }

    // Final total calculation with exact final rounding
    const finalTotalCost = roundToCent(rawItemsCost + rawFlightCost);
    const finalTotalSelling = roundToCent(rawItemsSelling + rawFlightSelling);
    const marginAmount = roundToCent(finalTotalSelling - finalTotalCost);
    const marginPercentage =
      finalTotalSelling > 0 ? roundToCent((marginAmount / finalTotalSelling) * 100) : 0;

    return {
      id: opt.id,
      option_label: opt.option_label,
      is_default: opt.is_default ?? false,
      total_cost_price: finalTotalCost,
      total_selling_price: finalTotalSelling,
      items_cost_price: roundToCent(rawItemsCost),
      items_selling_price: roundToCent(rawItemsSelling),
      margin_amount: marginAmount,
      margin_percentage: marginPercentage,
      calculated_items: calculatedItems,
    };
  });

  const defaultOption =
    calculatedOptions.find((o) => o.is_default) || calculatedOptions[0] || null;

  return {
    pricing_strategy: input.pricing_strategy,
    total_pax: pax,
    valid_flight_segments: validFlights,
    total_flight_cost: roundToCent(rawFlightCost),
    total_flight_selling: roundToCent(rawFlightSelling),
    options: calculatedOptions,
    default_option: defaultOption,
  };
}

/**
 * Computes and optionally persists quote pricing in database.
 */
export async function computeQuotePricing(
  quoteId: string,
  scopedPrisma: any
): Promise<CalculatedQuotePricingResult> {
  const quote = await scopedPrisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      trip: { select: { pax_adults: true, pax_children: true } },
      overall_tax_rate: true,
      flight_segments: true,
      options: {
        include: {
          days: {
            include: {
              items: {
                include: {
                  tax_rate: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!quote) {
    throw new Error(`Quote not found: ${quoteId}`);
  }

  const pricingInput: QuotePricingInput = {
    id: quote.id,
    pax_adults: quote.trip.pax_adults,
    pax_children: quote.trip.pax_children,
    pricing_strategy: quote.pricing_strategy,
    overall_markup_type: quote.overall_markup_type,
    overall_markup_value: quote.overall_markup_value ? Number(quote.overall_markup_value) : 0,
    overall_tax_rate: quote.overall_tax_rate
      ? {
          id: quote.overall_tax_rate.id,
          name: quote.overall_tax_rate.name,
          rate_percent: Number(quote.overall_tax_rate.rate_percent),
          is_inclusive: quote.overall_tax_rate.is_inclusive,
        }
      : null,
    flight_segments: quote.flight_segments.map((f: any) => ({
      id: f.id,
      airline: f.airline,
      flight_number: f.flight_number,
      cost_price: f.cost_price !== null ? Number(f.cost_price) : null,
      selling_price: f.selling_price !== null ? Number(f.selling_price) : null,
    })),
    options: quote.options.map((opt: any) => ({
      id: opt.id,
      option_label: opt.option_label,
      is_default: opt.is_default,
      days: opt.days.map((day: any) => ({
        id: day.id,
        day_number: day.day_number,
        title: day.title,
        items: day.items.map((item: any) => ({
          id: item.id,
          custom_name: item.custom_name,
          cost_price: Number(item.cost_price),
          selling_price: Number(item.selling_price),
          is_foc: item.is_foc,
          markup_type: item.markup_type,
          markup_value: item.markup_value !== null ? Number(item.markup_value) : 0,
          tax_basis: item.tax_basis,
          tax_rate: item.tax_rate
            ? {
                id: item.tax_rate.id,
                name: item.tax_rate.name,
                rate_percent: Number(item.tax_rate.rate_percent),
                is_inclusive: item.tax_rate.is_inclusive,
              }
            : null,
        })),
      })),
    })),
  };

  const result = calculateQuotePricing(pricingInput);

  // Update quote and options total pricing in DB
  if (result.default_option) {
    await scopedPrisma.quote.update({
      where: { id: quoteId },
      data: {
        total_cost_price: result.default_option.total_cost_price,
        total_selling_price: result.default_option.total_selling_price,
      },
    });

    for (const opt of result.options) {
      if (opt.id) {
        await scopedPrisma.quoteOption.update({
          where: { id: opt.id },
          data: {
            total_cost_price: opt.total_cost_price,
            total_selling_price: opt.total_selling_price,
          },
        });
      }
    }
  }

  return result;
}
