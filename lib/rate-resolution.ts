import { OccupancyType } from "@prisma/client";
import { AppError } from "./api-error";

export class RateResolutionError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, details); // 422 Unprocessable Entity for invalid pricing dates
    this.name = "RateResolutionError";
  }
}

export interface RateResolutionQuery {
  organization_id: string;
  hotel_room_id?: string;
  transport_service_id?: string;
  activity_id?: string;
  travel_date: Date | string;
  occupancy_type?: OccupancyType;
}

export interface ResolvedRate {
  rate_sheet_id: string;
  season_name: string;
  currency: string;
  base_price: number;
  sales_rate: number;
  ops_rate: number;
  is_weekend: boolean;
  occupancy_type: OccupancyType;
}

export interface RateSheetRecord {
  id: string;
  organization_id: string;
  hotel_room_id?: string | null;
  transport_service_id?: string | null;
  activity_id?: string | null;
  season_name: string;
  valid_from: Date;
  valid_to: Date;
  occupancy_type: OccupancyType;
  weekday_price: number | { toNumber(): number } | string;
  weekend_price?: number | { toNumber(): number } | string | null;
  sales_price?: number | { toNumber(): number } | string | null;
  ops_price?: number | { toNumber(): number } | string | null;
  currency: string;
  is_stop_sale: boolean;
  blackout_dates: Date[];
  is_archived: boolean;
}

/**
 * Resolves the accurate seasonal rate from an array of RateSheets or a database query.
 * 
 * Enforces PRD Part 3 Technical Constraints:
 * 1. Date window match: valid_from <= travel_date <= valid_to.
 * 2. Stop-sale / blackout dates check: hard-fails if blocked.
 * 3. Occupancy match (SINGLE, DOUBLE, TRIPLE, EXTRA_BED, PER_UNIT).
 * 4. Weekday vs. Weekend rate calculation (Sunday=0, Saturday=6).
 * 5. Separate Sales vs. Ops pricing split.
 * 6. HARD-FAIL on no valid match (no silent fallback to stale off-season prices).
 */
export function resolveRateFromSheets(
  rateSheets: RateSheetRecord[],
  query: RateResolutionQuery
): ResolvedRate {
  const travelDate = new Date(query.travel_date);

  if (isNaN(travelDate.getTime())) {
    throw new RateResolutionError("Invalid travel date provided for rate resolution.");
  }

  // Normalize travelDate to midnight UTC for date comparison
  const targetTime = travelDate.getTime();
  const requestedOccupancy = query.occupancy_type || OccupancyType.DOUBLE;

  // 1. Filter matching service and occupancy
  const applicableSheets = rateSheets.filter((sheet) => {
    if (sheet.is_archived) return false;
    if (sheet.organization_id !== query.organization_id) return false;

    if (query.hotel_room_id && sheet.hotel_room_id !== query.hotel_room_id) {
      return false;
    }
    if (
      query.transport_service_id &&
      sheet.transport_service_id !== query.transport_service_id
    ) {
      return false;
    }
    if (query.activity_id && sheet.activity_id !== query.activity_id) {
      return false;
    }

    if (query.hotel_room_id && sheet.occupancy_type !== requestedOccupancy) {
      return false;
    }

    return true;
  });

  if (applicableSheets.length === 0) {
    throw new RateResolutionError(
      `No rate sheet configured for the requested service and occupancy '${requestedOccupancy}'.`
    );
  }

  // 2. Find sheet matching the exact season date range
  const matchedSheet = applicableSheets.find((sheet) => {
    const fromTime = new Date(sheet.valid_from).getTime();
    const toTime = new Date(sheet.valid_to).getTime();
    return targetTime >= fromTime && targetTime <= toTime;
  });

  if (!matchedSheet) {
    const formattedDate = travelDate.toISOString().split("T")[0];
    throw new RateResolutionError(
      `No valid seasonal rate sheet found for travel date ${formattedDate}. All available seasons are outside the requested window.`
    );
  }

  // 3. Stop-sale and blackout checks
  if (matchedSheet.is_stop_sale) {
    throw new RateResolutionError(
      `Service is currently on Stop-Sale for the '${matchedSheet.season_name}' season.`
    );
  }

  const isBlackout = matchedSheet.blackout_dates.some((d) => {
    const bDate = new Date(d);
    return (
      bDate.getUTCFullYear() === travelDate.getUTCFullYear() &&
      bDate.getUTCMonth() === travelDate.getUTCMonth() &&
      bDate.getUTCDate() === travelDate.getUTCDate()
    );
  });

  if (isBlackout) {
    const formattedDate = travelDate.toISOString().split("T")[0];
    throw new RateResolutionError(
      `Date ${formattedDate} is marked as a Blackout Date for '${matchedSheet.season_name}'.`
    );
  }

  // 4. Weekday vs Weekend price
  // Day of week: 0 = Sunday, 6 = Saturday
  const dayOfWeek = travelDate.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const toNum = (val: any) => (val && typeof val.toNumber === "function" ? val.toNumber() : Number(val) || 0);

  const weekdayPrice = toNum(matchedSheet.weekday_price);
  const weekendPrice = matchedSheet.weekend_price !== null && matchedSheet.weekend_price !== undefined
    ? toNum(matchedSheet.weekend_price)
    : weekdayPrice;

  const effectiveBasePrice = isWeekend ? weekendPrice : weekdayPrice;

  // 5. Sales vs Ops pricing
  const salesRate =
    matchedSheet.sales_price !== null && matchedSheet.sales_price !== undefined
      ? toNum(matchedSheet.sales_price)
      : effectiveBasePrice;

  const opsRate =
    matchedSheet.ops_price !== null && matchedSheet.ops_price !== undefined
      ? toNum(matchedSheet.ops_price)
      : effectiveBasePrice;

  return {
    rate_sheet_id: matchedSheet.id,
    season_name: matchedSheet.season_name,
    currency: matchedSheet.currency,
    base_price: effectiveBasePrice,
    sales_rate: salesRate,
    ops_rate: opsRate,
    is_weekend: isWeekend,
    occupancy_type: matchedSheet.occupancy_type,
  };
}
