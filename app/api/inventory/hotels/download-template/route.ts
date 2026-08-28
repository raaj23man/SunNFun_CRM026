import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * GET /api/inventory/hotels/download-template
 * Generates an XLSX template with sample data demonstrating Sembark cell conventions:
 * - Room format: "Deluxe Room (40R)(2P)" -> 40 rooms, 2 max pax
 * - Vendor tagging: "Hotel Yak & Yeti [[HIMALAYAN DMC]]"
 * - Separate Sales vs. Ops pricing
 */
export async function GET(req: NextRequest) {
  try {
    const sampleData = [
      {
        "Hotel Name": "Hotel Yak & Yeti [[HIMALAYAN HOSPITALITY]]",
        Destination: "Kathmandu",
        "Star Rating": 5,
        "Room Type": "Heritage Deluxe (40R)(2P)",
        "Meal Plan": "CP",
        "Season Name": "Autumn Peak",
        "Valid From": "2026-09-01",
        "Valid To": "2026-11-30",
        Occupancy: "DOUBLE",
        "Weekday Price": 140,
        "Weekend Price": 155,
        "Sales Price": 175,
        "Ops Price": 130,
        Currency: "USD",
        Address: "Durbar Marg, Kathmandu",
        Website: "https://www.yakandyeti.com",
      },
      {
        "Hotel Name": "Temple Tree Resort & Spa",
        Destination: "Pokhara",
        "Star Rating": 4,
        "Room Type": "Deluxe Garden View (20R)(2P)",
        "Meal Plan": "CP",
        "Season Name": "Autumn Peak",
        "Valid From": "2026-09-01",
        "Valid To": "2026-11-30",
        Occupancy: "DOUBLE",
        "Weekday Price": 95,
        "Weekend Price": 110,
        "Sales Price": 120,
        "Ops Price": 85,
        Currency: "USD",
        Address: "Gaurighat, Lakeside, Pokhara",
        Website: "https://templetreenepal.com",
      },
      {
        "Hotel Name": "Barahi Jungle Lodge [[CHITWAN SAFARI LTD]]",
        Destination: "Chitwan",
        "Star Rating": 5,
        "Room Type": "Luxury Villa (12R)(3P)",
        "Meal Plan": "AP",
        "Season Name": "Winter Safari",
        "Valid From": "2026-10-01",
        "Valid To": "2026-12-31",
        Occupancy: "DOUBLE",
        "Weekday Price": 280,
        "Weekend Price": 280,
        "Sales Price": 340,
        "Ops Price": 260,
        Currency: "USD",
        Address: "Meghauli, Chitwan National Park",
        Website: "https://barahijunglelodge.com",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hotel Rate Template");

    // Set column widths
    worksheet["!cols"] = [
      { wch: 45 }, // Hotel Name
      { wch: 15 }, // Destination
      { wch: 12 }, // Star Rating
      { wch: 30 }, // Room Type
      { wch: 10 }, // Meal Plan
      { wch: 18 }, // Season Name
      { wch: 12 }, // Valid From
      { wch: 12 }, // Valid To
      { wch: 12 }, // Occupancy
      { wch: 14 }, // Weekday Price
      { wch: 14 }, // Weekend Price
      { wch: 14 }, // Sales Price
      { wch: 14 }, // Ops Price
      { wch: 10 }, // Currency
      { wch: 35 }, // Address
      { wch: 30 }, // Website
    ];

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Hotel_Rate_Master_Template.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate template." },
      { status: 500 }
    );
  }
}
