import * as XLSX from "xlsx";
import Papa from "papaparse";
import { OccupancyType } from "@prisma/client";
import { BadRequestError } from "./api-error";

export interface ParsedHotelRow {
  hotel_name: string;
  vendor_tag?: string | null;
  star_rating: number;
  destination_name: string;
  address?: string | null;
  website_url?: string | null;
  room_type: string;
  total_room_count?: number | null;
  max_occupancy: number;
  meal_plan: string;
  season_name: string;
  valid_from: string;
  valid_to: string;
  occupancy_type: OccupancyType;
  weekday_price: number;
  weekend_price?: number | null;
  sales_price?: number | null;
  ops_price?: number | null;
  currency: string;
}

export interface BulkImportResult {
  total_rows: number;
  valid_rows: ParsedHotelRow[];
  errors: { row_number: number; message: string; raw_row: any }[];
}

/**
 * 1. Cell Convention: Room Count & Occupancy Suffixes
 * Example: "Deluxe Room (40R)(2P)" or "Superior Suite (15R)(4P)" or "Standard (2P)"
 * Returns: { clean_room_type: "Deluxe Room", total_room_count: 40, max_occupancy: 2 }
 */
export function parseRoomCellConvention(roomCell: string): {
  clean_room_type: string;
  total_room_count: number | null;
  max_occupancy: number;
} {
  if (!roomCell) {
    return { clean_room_type: "Standard Room", total_room_count: null, max_occupancy: 2 };
  }

  let cleanName = roomCell.trim();
  let totalRooms: number | null = null;
  let maxOccupancy = 2;

  // Extract (40R) or (40 r) -> Room Count
  const roomCountMatch = cleanName.match(/\((\d+)\s*R\)/i);
  if (roomCountMatch) {
    totalRooms = parseInt(roomCountMatch[1], 10);
    cleanName = cleanName.replace(roomCountMatch[0], "").trim();
  }

  // Extract (2P) or (2 p) -> Max Pax / Occupancy
  const paxMatch = cleanName.match(/\((\d+)\s*P\)/i);
  if (paxMatch) {
    maxOccupancy = parseInt(paxMatch[1], 10);
    cleanName = cleanName.replace(paxMatch[0], "").trim();
  }

  // Remove any remaining empty parens or cleanup double spaces
  cleanName = cleanName.replace(/\s+/g, " ").trim();

  return {
    clean_room_type: cleanName || "Standard Room",
    total_room_count: totalRooms,
    max_occupancy: maxOccupancy,
  };
}

/**
 * 2. Cell Convention: Vendor Double-Bracket Tagging
 * Example: "Hotel Yak & Yeti [[HIMALAYAN DMC]]" or "Swift Dzire [[ABC TRAVELS]]"
 * Returns: { clean_name: "Hotel Yak & Yeti", vendor_tag: "HIMALAYAN DMC" }
 */
export function parseVendorTagConvention(nameCell: string): {
  clean_name: string;
  vendor_tag: string | null;
} {
  if (!nameCell) return { clean_name: "", vendor_tag: null };

  const match = nameCell.match(/\[\[(.*?)\]\]/);
  if (match) {
    const vendorTag = match[1].trim();
    const cleanName = nameCell.replace(match[0], "").replace(/\s+/g, " ").trim();
    return { clean_name: cleanName, vendor_tag: vendorTag };
  }

  return { clean_name: nameCell.trim(), vendor_tag: null };
}

/**
 * 3. Cell Convention: Column Header Suffixes for Sales vs. Ops Seasons
 * Example: "Peak Season (Sales)" vs "Peak Season (Ops)"
 * Returns: { clean_season_name: "Peak Season", rate_type: "SALES" | "OPS" | "STANDARD" }
 */
export function parseSeasonHeaderConvention(header: string): {
  clean_season_name: string;
  rate_type: "SALES" | "OPS" | "STANDARD";
} {
  if (/\(sales\)/i.test(header)) {
    return {
      clean_season_name: header.replace(/\(sales\)/i, "").trim(),
      rate_type: "SALES",
    };
  }

  if (/\(ops\)/i.test(header)) {
    return {
      clean_season_name: header.replace(/\(ops\)/i, "").trim(),
      rate_type: "OPS",
    };
  }

  return { clean_season_name: header.trim(), rate_type: "STANDARD" };
}

/**
 * Parses a raw CSV or XLSX buffer/string into structured hotel master data.
 */
export function parseHotelImportBuffer(
  fileBuffer: Buffer | ArrayBuffer,
  fileType: "csv" | "xlsx"
): BulkImportResult {
  let rawRows: any[] = [];

  if (fileType === "csv") {
    const csvString = Buffer.isBuffer(fileBuffer)
      ? fileBuffer.toString("utf-8")
      : new TextDecoder().decode(fileBuffer);
    const parsed = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
    });
    rawRows = parsed.data;
  } else {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  }

  const validRows: ParsedHotelRow[] = [];
  const errors: { row_number: number; message: string; raw_row: any }[] = [];

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed + header row offset

    try {
      const rawHotelName = row["Hotel Name"] || row["hotel_name"] || row["Hotel"] || "";
      const rawDestination = row["Destination"] || row["destination"] || row["City"] || "";
      const rawRoomType = row["Room Type"] || row["room_type"] || row["Room"] || "Standard";
      const rawStarRating = parseInt(row["Star Rating"] || row["star_rating"] || "3", 10);
      const rawMealPlan = (row["Meal Plan"] || row["meal_plan"] || "CP").toUpperCase().trim();
      const rawSeasonName = row["Season Name"] || row["season_name"] || row["Season"] || "Standard Season";
      const rawValidFrom = row["Valid From"] || row["valid_from"] || "2026-01-01";
      const rawValidTo = row["Valid To"] || row["valid_to"] || "2026-12-31";
      const rawWeekdayPrice = parseFloat(row["Weekday Price"] || row["weekday_price"] || row["Price"] || "0");
      const rawWeekendPrice = row["Weekend Price"] || row["weekend_price"] ? parseFloat(row["Weekend Price"] || row["weekend_price"]) : null;
      const rawSalesPrice = row["Sales Price"] || row["sales_price"] || row["Price (Sales)"] ? parseFloat(row["Sales Price"] || row["sales_price"] || row["Price (Sales)"]) : null;
      const rawOpsPrice = row["Ops Price"] || row["ops_price"] || row["Price (Ops)"] ? parseFloat(row["Ops Price"] || row["ops_price"] || row["Price (Ops)"]) : null;
      const rawCurrency = (row["Currency"] || row["currency"] || "USD").toUpperCase().trim();
      const rawOccupancy = (row["Occupancy"] || row["occupancy"] || "DOUBLE").toUpperCase().trim() as OccupancyType;

      if (!rawHotelName) {
        throw new Error("Missing required 'Hotel Name'");
      }
      if (!rawDestination) {
        throw new Error("Missing required 'Destination'");
      }
      if (isNaN(rawWeekdayPrice) || rawWeekdayPrice <= 0) {
        throw new Error("Invalid or missing 'Weekday Price'");
      }

      // Apply cell conventions
      const { clean_name: cleanHotelName, vendor_tag } = parseVendorTagConvention(rawHotelName);
      const { clean_room_type, total_room_count, max_occupancy } = parseRoomCellConvention(rawRoomType);

      validRows.push({
        hotel_name: cleanHotelName,
        vendor_tag: vendor_tag,
        star_rating: isNaN(rawStarRating) ? 3 : rawStarRating,
        destination_name: rawDestination.trim(),
        address: row["Address"] || row["address"] || null,
        website_url: row["Website"] || row["website"] || null,
        room_type: clean_room_type,
        total_room_count: total_room_count,
        max_occupancy: max_occupancy,
        meal_plan: rawMealPlan,
        season_name: rawSeasonName.trim(),
        valid_from: new Date(rawValidFrom).toISOString(),
        valid_to: new Date(rawValidTo).toISOString(),
        occupancy_type: Object.values(OccupancyType).includes(rawOccupancy) ? rawOccupancy : OccupancyType.DOUBLE,
        weekday_price: rawWeekdayPrice,
        weekend_price: rawWeekendPrice,
        sales_price: rawSalesPrice,
        ops_price: rawOpsPrice,
        currency: rawCurrency,
      });
    } catch (err: any) {
      errors.push({
        row_number: rowNum,
        message: err.message || "Failed to parse row",
        raw_row: row,
      });
    }
  });

  return {
    total_rows: rawRows.length,
    valid_rows: validRows,
    errors,
  };
}
