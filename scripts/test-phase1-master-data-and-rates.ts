/**
 * Comprehensive Test Suite for PRD Part 3:
 * - Master Data Schema & Tenant Isolation
 * - Bulk Import Parser & Sembark Cell Conventions
 * - Rate Resolution Engine (Hard-fail, Season, Weekend, Sales/Ops split)
 * - Hotel & TripSource Merges
 */

import { OccupancyType } from "@prisma/client";
import {
  parseRoomCellConvention,
  parseVendorTagConvention,
  parseSeasonHeaderConvention,
  parseHotelImportBuffer,
} from "../lib/bulk-import-parser";
import {
  resolveRateFromSheets,
  RateResolutionError,
  RateSheetRecord,
} from "../lib/rate-resolution";
import { TENANT_SCOPED_MODELS } from "../lib/prisma";
import * as XLSX from "xlsx";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

function expectThrows(fn: () => void, expectedFragment: string, testLabel: string) {
  try {
    fn();
    console.error(`❌ Expected error containing "${expectedFragment}", but no error was thrown.`);
    process.exit(1);
  } catch (err: any) {
    if (err.message && err.message.toLowerCase().includes(expectedFragment.toLowerCase())) {
      console.log(`  ✓ ${testLabel} (correctly threw: "${err.message}")`);
    } else {
      console.error(`❌ Expected error fragment "${expectedFragment}", but got: "${err.message}"`);
      process.exit(1);
    }
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("🚀 RUNNING PRD PART 3 MASTER DATA & RATE ENGINE TESTS");
  console.log("========================================================\n");

  // ----------------------------------------------------
  // 1. Multi-Tenant Model Isolation Checklist
  // ----------------------------------------------------
  console.log("🔹 Test 1: Multi-Tenant Scoping Includes All Part 3 Models");
  const requiredPart3Models = [
    "Supplier",
    "Hotel",
    "RateSheet",
    "TransportService",
    "TravelActivity",
    "Itinerary",
    "TripDestination",
    "TripSource",
  ];

  requiredPart3Models.forEach((model) => {
    assert(
      TENANT_SCOPED_MODELS.includes(model as any),
      `TENANT_SCOPED_MODELS includes '${model}'`
    );
  });

  // ----------------------------------------------------
  // 2. Sembark Cell Convention Parsing
  // ----------------------------------------------------
  console.log("\n🔹 Test 2: Sembark Cell Conventions Parsing");

  // Convention A: Room count (40R) and Max Pax (2P)
  const roomA = parseRoomCellConvention("Deluxe Heritage (40R)(2P)");
  assert(roomA.clean_room_type === "Deluxe Heritage", "Room name parsed: Deluxe Heritage");
  assert(roomA.total_room_count === 40, "Room count extracted: 40");
  assert(roomA.max_occupancy === 2, "Max occupancy extracted: 2");

  const roomB = parseRoomCellConvention("Family Suite (12R)(4P)");
  assert(roomB.clean_room_type === "Family Suite", "Room name parsed: Family Suite");
  assert(roomB.total_room_count === 12, "Room count extracted: 12");
  assert(roomB.max_occupancy === 4, "Max occupancy extracted: 4");

  // Convention B: Vendor double-bracket tagging [[VENDOR]]
  const vendorA = parseVendorTagConvention("Hotel Yak & Yeti [[HIMALAYAN HOSPITALITY]]");
  assert(vendorA.clean_name === "Hotel Yak & Yeti", "Hotel name parsed cleanly without vendor tags");
  assert(vendorA.vendor_tag === "HIMALAYAN HOSPITALITY", "Vendor tag extracted: HIMALAYAN HOSPITALITY");

  const vendorB = parseVendorTagConvention("Swift Dzire [[ABC CAR RENTALS]]");
  assert(vendorB.clean_name === "Swift Dzire", "Vehicle name parsed cleanly");
  assert(vendorB.vendor_tag === "ABC CAR RENTALS", "Vendor tag extracted: ABC CAR RENTALS");

  // Convention C: Sales vs. Ops season header suffixes
  const seasonSales = parseSeasonHeaderConvention("Autumn Peak (Sales)");
  assert(seasonSales.clean_season_name === "Autumn Peak", "Season name: Autumn Peak");
  assert(seasonSales.rate_type === "SALES", "Rate type identified as SALES");

  const seasonOps = parseSeasonHeaderConvention("Autumn Peak (Ops)");
  assert(seasonOps.clean_season_name === "Autumn Peak", "Season name: Autumn Peak");
  assert(seasonOps.rate_type === "OPS", "Rate type identified as OPS");

  // ----------------------------------------------------
  // 3. Full Buffer Import & Parsing (CSV / XLSX)
  // ----------------------------------------------------
  console.log("\n🔹 Test 3: XLSX/CSV Buffer Parsing");
  const sampleRows = [
    {
      "Hotel Name": "Barahi Jungle Lodge [[CHITWAN SAFARI]]",
      Destination: "Chitwan",
      "Star Rating": 5,
      "Room Type": "Luxury Villa (15R)(2P)",
      "Meal Plan": "AP",
      "Season Name": "Winter Safari",
      "Valid From": "2026-10-01",
      "Valid To": "2026-12-31",
      Occupancy: "DOUBLE",
      "Weekday Price": 250,
      "Weekend Price": 280,
      "Sales Price": 310,
      "Ops Price": 230,
      Currency: "USD",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const importResult = parseHotelImportBuffer(xlsxBuffer, "xlsx");
  assert(importResult.valid_rows.length === 1, "Parsed 1 valid row from XLSX buffer");
  assert(importResult.valid_rows[0].hotel_name === "Barahi Jungle Lodge", "Parsed hotel name");
  assert(importResult.valid_rows[0].vendor_tag === "CHITWAN SAFARI", "Parsed vendor tag from XLSX");
  assert(importResult.valid_rows[0].total_room_count === 15, "Parsed total room count: 15");
  assert(importResult.valid_rows[0].max_occupancy === 2, "Parsed max occupancy: 2");

  // ----------------------------------------------------
  // 4. Rate Resolution Engine
  // ----------------------------------------------------
  console.log("\n🔹 Test 4: Rate Resolution Engine Execution");
  const mockRateSheets: RateSheetRecord[] = [
    {
      id: "rate_peak_001",
      organization_id: "org_sunnfun",
      hotel_room_id: "room_deluxe_001",
      season_name: "Autumn Peak",
      valid_from: new Date("2026-09-01T00:00:00.000Z"),
      valid_to: new Date("2026-11-30T23:59:59.000Z"),
      occupancy_type: OccupancyType.DOUBLE,
      weekday_price: 140,
      weekend_price: 165,
      sales_price: 180,
      ops_price: 125,
      currency: "USD",
      is_stop_sale: false,
      blackout_dates: [new Date("2026-10-15T00:00:00.000Z")],
      is_archived: false,
    },
    {
      id: "rate_stopsale_002",
      organization_id: "org_sunnfun",
      hotel_room_id: "room_deluxe_001",
      season_name: "Monsoon Special",
      valid_from: new Date("2026-06-01T00:00:00.000Z"),
      valid_to: new Date("2026-08-31T23:59:59.000Z"),
      occupancy_type: OccupancyType.DOUBLE,
      weekday_price: 90,
      weekend_price: 100,
      sales_price: 110,
      ops_price: 80,
      currency: "USD",
      is_stop_sale: true, // Stop-Sale active
      blackout_dates: [],
      is_archived: false,
    },
  ];

  // Case A: Weekday in Peak Season (Wednesday Oct 7, 2026)
  const weekdayResolution = resolveRateFromSheets(mockRateSheets, {
    organization_id: "org_sunnfun",
    hotel_room_id: "room_deluxe_001",
    travel_date: "2026-10-07T10:00:00.000Z",
    occupancy_type: OccupancyType.DOUBLE,
  });
  assert(weekdayResolution.base_price === 140, "Weekday rate: $140");
  assert(weekdayResolution.sales_rate === 180, "Sales rate: $180");
  assert(weekdayResolution.ops_rate === 125, "Ops cost rate: $125");
  assert(weekdayResolution.is_weekend === false, "Recognized as weekday");

  // Case B: Weekend in Peak Season (Saturday Oct 10, 2026)
  const weekendResolution = resolveRateFromSheets(mockRateSheets, {
    organization_id: "org_sunnfun",
    hotel_room_id: "room_deluxe_001",
    travel_date: "2026-10-10T10:00:00.000Z",
    occupancy_type: OccupancyType.DOUBLE,
  });
  assert(weekendResolution.base_price === 165, "Weekend rate applied: $165");
  assert(weekendResolution.is_weekend === true, "Recognized as weekend");

  // Case C: Hard-fail on out-of-range date (Jan 15, 2027) -> MUST NOT fallback to stale rate
  expectThrows(
    () =>
      resolveRateFromSheets(mockRateSheets, {
        organization_id: "org_sunnfun",
        hotel_room_id: "room_deluxe_001",
        travel_date: "2027-01-15T00:00:00.000Z",
        occupancy_type: OccupancyType.DOUBLE,
      }),
    "No valid seasonal rate sheet found",
    "Hard-fail on out-of-range date (no stale price fallback)"
  );

  // Case D: Hard-fail on Stop-Sale date
  expectThrows(
    () =>
      resolveRateFromSheets(mockRateSheets, {
        organization_id: "org_sunnfun",
        hotel_room_id: "room_deluxe_001",
        travel_date: "2026-07-10T00:00:00.000Z",
        occupancy_type: OccupancyType.DOUBLE,
      }),
    "Stop-Sale",
    "Hard-fail on Stop-Sale active season"
  );

  // Case E: Hard-fail on Blackout date (Oct 15, 2026)
  expectThrows(
    () =>
      resolveRateFromSheets(mockRateSheets, {
        organization_id: "org_sunnfun",
        hotel_room_id: "room_deluxe_001",
        travel_date: "2026-10-15T00:00:00.000Z",
        occupancy_type: OccupancyType.DOUBLE,
      }),
    "Blackout Date",
    "Hard-fail on Blackout date"
  );

  console.log("\n========================================================");
  console.log("🎉 ALL PRD PART 3 MASTER DATA & RATE TESTS PASSED!");
  console.log("========================================================\n");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
