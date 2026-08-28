/**
 * Comprehensive Unit Test Suite for PRD Part 4:
 * Quotation Pricing Calculation Engine & 4 Pricing Strategies
 *
 * Checks exact financial precision, non-intermediate rounding,
 * FOC lines, tax basis (COST_PLUS_MARKUP vs MARKUP_ONLY),
 * and flight segment validation.
 */

import {
  calculateQuotePricing,
  filterValidFlightSegments,
  roundToCent,
  QuotePricingInput,
} from "../lib/quote-pricing";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

function assertCloseTo(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) > 0.001) {
    console.error(`❌ ${label}: Expected ${expected}, but got ${actual}`);
    process.exit(1);
  }
  console.log(`  ✓ ${label}: ${actual.toFixed(2)} (matches hand-calculated ${expected.toFixed(2)})`);
}

async function runTests() {
  console.log("\n========================================================");
  console.log("🚀 RUNNING PRD PART 4 QUOTE PRICING UNIT TESTS");
  console.log("========================================================\n");

  // -------------------------------------------------------------------------
  // 1. Flight Validation Test (Sembark documented constraint)
  // -------------------------------------------------------------------------
  console.log("🔹 Test 1: Flight Segment Validation (both cost & selling required)");
  const sampleFlights = [
    { airline: "Nepal Airlines", flight_number: "RA-205", cost_price: 150, selling_price: 180 },
    { airline: "Buddha Air", flight_number: "U4-501", cost_price: 80, selling_price: null }, // missing selling
    { airline: "Yeti Airlines", flight_number: "YT-311", cost_price: null, selling_price: 95 }, // missing cost
    { airline: "Qatar Airways", flight_number: "QR-652", cost_price: 450, selling_price: 520 },
  ];

  const validFlights = filterValidFlightSegments(sampleFlights);
  assert(validFlights.length === 2, "Filtered exactly 2 valid flights (rejected partial nulls)");
  assert(validFlights[0].flight_number === "RA-205", "Retained RA-205");
  assert(validFlights[1].flight_number === "QR-652", "Retained QR-652");

  // -------------------------------------------------------------------------
  // 2. Strategy 1: OVERALL PRICING
  // -------------------------------------------------------------------------
  console.log("\n🔹 Test 2: Strategy 1 — OVERALL Pricing Calculation");
  /**
   * Hand Calculation:
   * - Hotel 2N: $240 cost
   * - Transport: $100 cost
   * - Activity (FOC): $50 cost, $0 selling
   * -> Total Cost = $390. Non-FOC items cost = $340.
   * - Flight: cost $200, selling $250.
   * - Overall Markup: 20% on non-FOC ($340 * 0.20 = $68) -> Pre-tax items = $408.
   * - Exclusive Tax: 5% on $408 = $20.40 -> Items selling = $428.40.
   * - Total Quote Cost = $390 + $200 = $590.00
   * - Total Quote Selling = $428.40 + $250 = $678.40
   * - Margin Amount = $678.40 - $590.00 = $88.40
   * - Margin % = (88.40 / 678.40) * 100 = 13.03%
   */
  const overallInput: QuotePricingInput = {
    pax_adults: 2,
    pax_children: 0,
    pricing_strategy: "OVERALL",
    overall_markup_type: "PERCENT",
    overall_markup_value: 20,
    overall_tax_rate: { name: "GST 5%", rate_percent: 5, is_inclusive: false },
    flight_segments: [
      { airline: "Test Air", flight_number: "TA-101", cost_price: 200, selling_price: 250 },
    ],
    options: [
      {
        option_label: "Deluxe",
        is_default: true,
        days: [
          {
            day_number: 1,
            title: "Arrival",
            items: [
              { custom_name: "Hotel Yak & Yeti", cost_price: 240, is_foc: false },
              { custom_name: "Airport Transfer", cost_price: 100, is_foc: false },
              { custom_name: "Welcome Drink & Show", cost_price: 50, is_foc: true }, // FOC
            ],
          },
        ],
      },
    ],
  };

  const overallResult = calculateQuotePricing(overallInput);
  const opt1 = overallResult.options[0];

  assertCloseTo(opt1.total_cost_price, 590.0, "OVERALL Total Cost");
  assertCloseTo(opt1.total_selling_price, 678.4, "OVERALL Total Selling Price");
  assertCloseTo(opt1.margin_amount, 88.4, "OVERALL Margin Amount");
  assertCloseTo(opt1.margin_percentage, 13.03, "OVERALL Margin Percentage");

  // -------------------------------------------------------------------------
  // 3. Strategy 2: PER_PERSON PRICING (with single final rounding check)
  // -------------------------------------------------------------------------
  console.log("\n🔹 Test 3: Strategy 2 — PER_PERSON Pricing (No intermediate rounding)");
  /**
   * Hand Calculation:
   * - 3 Pax
   * - Non-FOC items cost: $100.00
   * - Cost per person: $100.00 / 3 = 33.333333333333336
   * - Flat markup per person: $10.00 -> Pre-tax per person: 43.333333333333336
   * - Tax 10% on 43.333333333333336 = 4.333333333333334
   * - Selling per person: 47.66666666666667
   * - Total Selling = 47.66666666666667 * 3 = $143.00!
   * (If rounded per-person to $47.67 first, 47.67 * 3 would be $143.01 — off by 1 cent! Sembark rule prevents this).
   */
  const perPersonInput: QuotePricingInput = {
    pax_adults: 3,
    pax_children: 0,
    pricing_strategy: "PER_PERSON",
    overall_markup_type: "FLAT",
    overall_markup_value: 10,
    overall_tax_rate: { name: "VAT 10%", rate_percent: 10, is_inclusive: false },
    options: [
      {
        option_label: "Standard",
        is_default: true,
        days: [
          {
            day_number: 1,
            title: "Day 1",
            items: [{ custom_name: "Tour Package", cost_price: 100, is_foc: false }],
          },
        ],
      },
    ],
  };

  const perPersonResult = calculateQuotePricing(perPersonInput);
  assertCloseTo(
    perPersonResult.options[0].total_selling_price,
    143.0,
    "PER_PERSON Total Selling (avoids off-by-one-cent rounding error)"
  );

  // -------------------------------------------------------------------------
  // 4. Strategy 3: PER_COMPONENT PRICING
  // -------------------------------------------------------------------------
  console.log("\n🔹 Test 4: Strategy 3 — PER_COMPONENT Pricing (Inline markups & taxes)");
  /**
   * Hand Calculation:
   * - Item 1 (Hotel): Cost $300, 15% markup = $45. Tax: COST_PLUS_MARKUP 10% on $345 = $34.50 -> Selling = $379.50
   * - Item 2 (Cab): Cost $150, Flat markup $50 = $50. Tax: MARKUP_ONLY 18% on $50 = $9.00 -> Selling = $209.00
   * - Item 3 (Museum): Cost $80, FOC = true -> Selling = $0
   * - Flight: Cost $120, Selling $150
   *
   * Total Cost = $300 + $150 + $80 + $120 = $650.00
   * Total Selling = $379.50 + $209.00 + $0 + $150 = $738.50
   * Margin = $738.50 - $650.00 = $88.50
   */
  const perComponentInput: QuotePricingInput = {
    pax_adults: 2,
    pricing_strategy: "PER_COMPONENT",
    flight_segments: [
      { airline: "Flight Co", flight_number: "FC-10", cost_price: 120, selling_price: 150 },
    ],
    options: [
      {
        option_label: "Luxury",
        is_default: true,
        days: [
          {
            day_number: 1,
            title: "Day 1",
            items: [
              {
                custom_name: "Hotel Suite",
                cost_price: 300,
                markup_type: "PERCENT",
                markup_value: 15,
                tax_basis: "COST_PLUS_MARKUP",
                tax_rate: { name: "Hotel GST 10%", rate_percent: 10, is_inclusive: false },
              },
              {
                custom_name: "Private Cab",
                cost_price: 150,
                markup_type: "FLAT",
                markup_value: 50,
                tax_basis: "MARKUP_ONLY",
                tax_rate: { name: "Transport Tax 18%", rate_percent: 18, is_inclusive: false },
              },
              {
                custom_name: "Complimentary Museum Entry",
                cost_price: 80,
                is_foc: true,
              },
            ],
          },
        ],
      },
    ],
  };

  const perComponentResult = calculateQuotePricing(perComponentInput);
  const optComponent = perComponentResult.options[0];

  assertCloseTo(optComponent.total_cost_price, 650.0, "PER_COMPONENT Total Cost");
  assertCloseTo(optComponent.total_selling_price, 738.5, "PER_COMPONENT Total Selling Price");
  assertCloseTo(optComponent.margin_amount, 88.5, "PER_COMPONENT Margin Amount");
  assert(optComponent.calculated_items[2].selling_price === 0, "FOC Item Selling Price is $0.00");
  assert(optComponent.calculated_items[2].cost_price === 80, "FOC Item Cost Price is retained at $80.00");

  // -------------------------------------------------------------------------
  // 5. Strategy 4: PER_COMPONENT_PER_PERSON PRICING
  // -------------------------------------------------------------------------
  console.log("\n🔹 Test 5: Strategy 4 — PER_COMPONENT_PER_PERSON Pricing");
  /**
   * Hand Calculation:
   * - 4 Pax
   * - Item 1 (Total Cost $400, $100/pax):
   *     Markup 20% on $100 = $20/pax
   *     Tax 5% COST_PLUS_MARKUP on $120 = $6/pax
   *     Selling/pax = $126 -> Total Selling = $126 * 4 = $504.00
   * - Item 2 (Total Cost $200, $50/pax):
   *     Markup Flat $15/pax
   *     Tax 10% MARKUP_ONLY on $15 = $1.50/pax
   *     Selling/pax = $50 + $15 + $1.50 = $66.50 -> Total Selling = $66.50 * 4 = $266.00
   *
   * Total Items Cost = $600.00
   * Total Items Selling = $504.00 + $266.00 = $770.00
   */
  const perCompPerPaxInput: QuotePricingInput = {
    pax_adults: 4,
    pricing_strategy: "PER_COMPONENT_PER_PERSON",
    options: [
      {
        option_label: "Premium",
        is_default: true,
        days: [
          {
            day_number: 1,
            title: "Day 1",
            items: [
              {
                custom_name: "Resort Stay",
                cost_price: 400,
                markup_type: "PERCENT",
                markup_value: 20,
                tax_basis: "COST_PLUS_MARKUP",
                tax_rate: { name: "GST 5%", rate_percent: 5, is_inclusive: false },
              },
              {
                custom_name: "Guided Excursion",
                cost_price: 200,
                markup_type: "FLAT",
                markup_value: 15,
                tax_basis: "MARKUP_ONLY",
                tax_rate: { name: "VAT 10%", rate_percent: 10, is_inclusive: false },
              },
            ],
          },
        ],
      },
    ],
  };

  const perCompPerPaxResult = calculateQuotePricing(perCompPerPaxInput);
  const optCompPerPax = perCompPerPaxResult.options[0];

  assertCloseTo(optCompPerPax.total_cost_price, 600.0, "PER_COMPONENT_PER_PERSON Total Cost");
  assertCloseTo(optCompPerPax.total_selling_price, 770.0, "PER_COMPONENT_PER_PERSON Total Selling");
  assertCloseTo(optCompPerPax.margin_amount, 170.0, "PER_COMPONENT_PER_PERSON Margin Amount");

  // -------------------------------------------------------------------------
  // 6. Multi-Option Comparison (Deluxe vs. Luxury vs. Premium)
  // -------------------------------------------------------------------------
  console.log("\n🔹 Test 6: Multi-Option Quote Calculation (Tiers in 1 Doc)");
  const multiOptionInput: QuotePricingInput = {
    pax_adults: 2,
    pricing_strategy: "OVERALL",
    overall_markup_type: "PERCENT",
    overall_markup_value: 10,
    options: [
      {
        option_label: "Deluxe Tier",
        is_default: true,
        days: [
          {
            day_number: 1,
            title: "Day 1",
            items: [{ custom_name: "3-Star Hotel", cost_price: 200 }],
          },
        ],
      },
      {
        option_label: "Luxury Tier",
        is_default: false,
        days: [
          {
            day_number: 1,
            title: "Day 1",
            items: [{ custom_name: "5-Star Hotel", cost_price: 500 }],
          },
        ],
      },
    ],
  };

  const multiOptResult = calculateQuotePricing(multiOptionInput);
  assert(multiOptResult.options.length === 2, "2 Options computed in single quote document");
  assertCloseTo(multiOptResult.options[0].total_selling_price, 220.0, "Deluxe Tier Selling ($200 + 10%)");
  assertCloseTo(multiOptResult.options[1].total_selling_price, 550.0, "Luxury Tier Selling ($500 + 10%)");
  assert(multiOptResult.default_option?.option_label === "Deluxe Tier", "Correct default option selected");

  console.log("\n========================================================");
  console.log("🎉 ALL PRD PART 4 QUOTE PRICING UNIT TESTS PASSED!");
  console.log("========================================================\n");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
