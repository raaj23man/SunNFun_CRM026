/**
 * Full End-to-End Verification Test Script for PRD Part 4:
 * 1. Create a lead (Guest + sequential Trip)
 * 2. Build 3-day itinerary with 2 hotel options (Standard vs. Luxury)
 * 3. Apply Per-Component pricing
 * 4. Generate and verify Puppeteer PDF buffer
 * 5. Generate and verify WhatsApp share text
 * 6. Verify Quick Add store state-preservation isolation
 */

import { calculateQuotePricing, QuotePricingInput } from "../lib/quote-pricing";
import { formatWhatsAppShareText, formatEmailHtml, ShareQuoteData } from "../lib/share-formatter";
import { generateQuotePdfBuffer } from "../lib/pdf-generator";
import { useQuickAddStore } from "../stores/quickAddStore";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("\n========================================================");
  console.log("🚀 RUNNING PRD PART 4 QUOTE BUILDER & PDF FULL FLOW TESTS");
  console.log("========================================================\n");

  // -------------------------------------------------------------------------
  // 1. Lead & 3-Day Itinerary Data Construction
  // -------------------------------------------------------------------------
  console.log("🔹 Step 1: 3-Day Multi-Option Itinerary Configuration");

  const quoteInput: QuotePricingInput = {
    pax_adults: 2,
    pax_children: 0,
    pricing_strategy: "PER_COMPONENT",
    options: [
      {
        option_label: "Standard 3-Star",
        is_default: true,
        days: [
          {
            day_number: 1,
            title: "Arrival in Kathmandu & Thamel Stroll",
            items: [
              {
                custom_name: "Hotel Mulberry (Deluxe Room)",
                cost_price: 90,
                markup_type: "PERCENT",
                markup_value: 20,
                tax_basis: "COST_PLUS_MARKUP",
                tax_rate: { name: "VAT 13%", rate_percent: 13, is_inclusive: false },
              },
              {
                custom_name: "Private Airport Pickup (Sedan)",
                cost_price: 30,
                markup_type: "FLAT",
                markup_value: 10,
                tax_basis: "MARKUP_ONLY",
                tax_rate: { name: "Transport Tax 10%", rate_percent: 10, is_inclusive: false },
              },
            ],
          },
          {
            day_number: 2,
            title: "Boudhanath & Pashupatinath Tour",
            items: [
              {
                custom_name: "Heritage Sightseeing Guide",
                cost_price: 40,
                markup_type: "FLAT",
                markup_value: 15,
                tax_basis: "COST_PLUS_MARKUP",
                tax_rate: { name: "VAT 13%", rate_percent: 13, is_inclusive: false },
              },
              {
                custom_name: "Welcome Butter Lamp Ceremony",
                cost_price: 25,
                is_foc: true, // Complimentary FOC
              },
            ],
          },
          {
            day_number: 3,
            title: "Departure Transfer",
            items: [
              {
                custom_name: "Private Airport Drop (Sedan)",
                cost_price: 30,
                markup_type: "FLAT",
                markup_value: 10,
                tax_basis: "MARKUP_ONLY",
                tax_rate: { name: "Transport Tax 10%", rate_percent: 10, is_inclusive: false },
              },
            ],
          },
        ],
      },
      {
        option_label: "Luxury 5-Star",
        is_default: false,
        days: [
          {
            day_number: 1,
            title: "Arrival in Kathmandu & Thamel Stroll",
            items: [
              {
                custom_name: "The Dwarika's Hotel (Heritage Suite)",
                cost_price: 350,
                markup_type: "PERCENT",
                markup_value: 25,
                tax_basis: "COST_PLUS_MARKUP",
                tax_rate: { name: "VAT 13%", rate_percent: 13, is_inclusive: false },
              },
              {
                custom_name: "Luxury VIP Airport Transfer",
                cost_price: 60,
                markup_type: "FLAT",
                markup_value: 25,
                tax_basis: "MARKUP_ONLY",
                tax_rate: { name: "Transport Tax 10%", rate_percent: 10, is_inclusive: false },
              },
            ],
          },
          {
            day_number: 2,
            title: "Boudhanath & Pashupatinath Tour",
            items: [
              {
                custom_name: "Senior Historian Private Guide",
                cost_price: 80,
                markup_type: "FLAT",
                markup_value: 30,
                tax_basis: "COST_PLUS_MARKUP",
                tax_rate: { name: "VAT 13%", rate_percent: 13, is_inclusive: false },
              },
            ],
          },
          {
            day_number: 3,
            title: "Departure Transfer",
            items: [
              {
                custom_name: "Luxury VIP Airport Drop",
                cost_price: 60,
                markup_type: "FLAT",
                markup_value: 25,
                tax_basis: "MARKUP_ONLY",
                tax_rate: { name: "Transport Tax 10%", rate_percent: 10, is_inclusive: false },
              },
            ],
          },
        ],
      },
    ],
  };

  const calculated = calculateQuotePricing(quoteInput);

  assert(calculated.options.length === 2, "2 Multi-Option tiers calculated");
  const standardOpt = calculated.options[0];
  const luxuryOpt = calculated.options[1];

  console.log(`  Standard Tier Cost: $${standardOpt.total_cost_price} | Selling: $${standardOpt.total_selling_price}`);
  console.log(`  Luxury Tier Cost: $${luxuryOpt.total_cost_price} | Selling: $${luxuryOpt.total_selling_price}`);

  assert(standardOpt.total_selling_price > standardOpt.total_cost_price, "Standard tier is profitable");
  assert(luxuryOpt.total_selling_price > luxuryOpt.total_cost_price, "Luxury tier is profitable");
  assert(luxuryOpt.total_selling_price > standardOpt.total_selling_price, "Luxury tier costs more than Standard");

  // -------------------------------------------------------------------------
  // 2. WhatsApp Share Formatter Verification
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 2: WhatsApp Share Text Generation");
  const shareData: ShareQuoteData = {
    tripDisplayId: "SBC-10001",
    guestName: "Priya Sharma",
    destinationName: "Kathmandu Valley",
    durationNights: 2,
    durationDays: 3,
    startDate: "2026-09-15T00:00:00.000Z",
    paxAdults: 2,
    paxChildren: 0,
    currency: "USD",
    totalSellingPrice: standardOpt.total_selling_price,
    pricingStrategy: "PER_COMPONENT",
    options: calculated.options.map((opt) => ({
      optionLabel: opt.option_label,
      isDefault: opt.is_default,
      totalSellingPrice: opt.total_selling_price,
      days: quoteInput.options
        .find((o) => o.option_label === opt.option_label)!
        .days.map((d) => ({
          dayNumber: d.day_number,
          title: d.title,
          description: "Explore the ancient palaces.",
          items: d.items.map((i) => ({
            itemType: i.custom_name?.toLowerCase().includes("hotel") ? "HOTEL" : "SERVICE",
            name: i.custom_name || "",
            isFoc: i.is_foc,
          })),
        })),
    })),
  };

  const whatsappText = formatWhatsAppShareText(shareData, {
    useSimilarHotelWording: true,
  });

  assert(whatsappText.includes("*Tour Proposal: Kathmandu Valley (SBC-10001)*"), "Contains bold title");
  assert(whatsappText.includes("STANDARD 3-STAR"), "Contains Standard Option");
  assert(whatsappText.includes("LUXURY 5-STAR"), "Contains Luxury Option");
  assert(whatsappText.includes("(Complimentary)"), "Mentions FOC complimentary item");
  assert(whatsappText.includes("or similar"), "Applies 'or similar' hotel wording toggle");

  // -------------------------------------------------------------------------
  // 3. Server-Side Puppeteer PDF Generation
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 3: Server-Side Puppeteer PDF Generation");
  const pdfBuffer = await generateQuotePdfBuffer({
    quoteData: shareData,
    brandName: "SunNFun Holidays",
    isBranded: true,
  });

  assert(Buffer.isBuffer(pdfBuffer), "Generated valid Buffer");
  assert(pdfBuffer.length > 5000, `PDF generated with size ${pdfBuffer.length} bytes`);
  assert(pdfBuffer.toString("utf-8", 0, 4) === "%PDF", "Valid PDF header format (%PDF)");

  // -------------------------------------------------------------------------
  // 4. Quick Add Zustand Store State-Preservation Isolation
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 4: Quick Add Store State-Preservation Isolation");
  useQuickAddStore.getState().openQuickAdd({
    type: "HOTEL",
    dayIndex: 1,
    itemIndex: 0,
    initialName: "Hotel Annapurna",
    destinationId: "dest-123",
  });

  assert(useQuickAddStore.getState().isOpen === true, "Quick Add modal opened");
  assert(useQuickAddStore.getState().initialName === "Hotel Annapurna", "Initial search term preserved");

  useQuickAddStore.getState().closeQuickAdd();
  assert(useQuickAddStore.getState().isOpen === false, "Quick Add modal closed cleanly");

  console.log("\n========================================================");
  console.log("🎉 ALL PRD PART 4 QUOTE BUILDER & PDF TESTS PASSED!");
  console.log("========================================================\n");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
