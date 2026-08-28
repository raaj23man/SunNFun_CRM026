import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { parseHotelImportBuffer, ParsedHotelRow } from "@/lib/bulk-import-parser";
import { BadRequestError } from "@/lib/api-error";
import { OccupancyType } from "@prisma/client";

/**
 * POST /api/inventory/hotels/bulk-import
 * Handles multipart file upload (CSV or XLSX) or pre-parsed JSON array.
 * Creates/links Destination -> Supplier -> Hotel -> HotelRoom -> RateSheet.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    let parsedRows: ParsedHotelRow[] = [];
    let initialErrors: any[] = [];

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        throw new BadRequestError("No file uploaded. Please attach a CSV or XLSX file.");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      const result = parseHotelImportBuffer(buffer, isXlsx ? "xlsx" : "csv");

      parsedRows = result.valid_rows;
      initialErrors = result.errors;
    } else {
      // Direct JSON import
      const body = await req.json();
      if (!body.rows || !Array.isArray(body.rows)) {
        throw new BadRequestError("Invalid payload: 'rows' array is required.");
      }
      parsedRows = body.rows;
    }

    if (parsedRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid rows found to import.",
          errors: initialErrors,
        },
        { status: 400 }
      );
    }

    let successCount = 0;
    const processingErrors: any[] = [...initialErrors];

    // Process each row in database transaction
    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const rowNumber = i + 2;

      try {
        // 1. Find or create destination
        let destination = await scopedPrisma.tripDestination.findFirst({
          where: {
            organization_id: user.organization_id,
            name: { equals: row.destination_name, mode: "insensitive" },
          },
        });

        if (!destination) {
          destination = await scopedPrisma.tripDestination.create({
            data: {
              organization_id: user.organization_id,
              name: row.destination_name,
            },
          });
        }

        // 2. Find or create supplier if vendor tag [[VENDOR]] present
        let supplierId: string | null = null;
        if (row.vendor_tag) {
          let supplier = await scopedPrisma.supplier.findFirst({
            where: {
              organization_id: user.organization_id,
              name: { equals: row.vendor_tag, mode: "insensitive" },
            },
          });

          if (!supplier) {
            supplier = await scopedPrisma.supplier.create({
              data: {
                organization_id: user.organization_id,
                name: row.vendor_tag,
                type: "HOTEL",
              },
            });
          }
          supplierId = supplier.id;
        }

        // 3. Find or create hotel
        let hotel = await scopedPrisma.hotel.findFirst({
          where: {
            organization_id: user.organization_id,
            destination_id: destination.id,
            name: { equals: row.hotel_name, mode: "insensitive" },
            is_archived: false,
          },
        });

        if (!hotel) {
          hotel = await scopedPrisma.hotel.create({
            data: {
              organization_id: user.organization_id,
              destination_id: destination.id,
              supplier_id: supplierId,
              name: row.hotel_name,
              star_rating: row.star_rating,
              address: row.address || null,
              website_url: row.website_url || null,
              entry_method: "FILE_UPLOAD",
            },
          });
        }

        // 4. Find or create hotel room
        let room = await scopedPrisma.hotelRoom.findFirst({
          where: {
            hotel_id: hotel.id,
            room_type: { equals: row.room_type, mode: "insensitive" },
          },
        });

        if (!room) {
          room = await scopedPrisma.hotelRoom.create({
            data: {
              hotel_id: hotel.id,
              room_type: row.room_type,
              meal_plan: row.meal_plan,
              max_occupancy: row.max_occupancy,
              total_room_count: row.total_room_count,
            },
          });
        }

        // 5. Create RateSheet row
        await scopedPrisma.rateSheet.create({
          data: {
            organization_id: user.organization_id,
            hotel_room_id: room.id,
            season_name: row.season_name,
            valid_from: new Date(row.valid_from),
            valid_to: new Date(row.valid_to),
            occupancy_type: row.occupancy_type || OccupancyType.DOUBLE,
            weekday_price: row.weekday_price,
            weekend_price: row.weekend_price !== null && row.weekend_price !== undefined ? row.weekend_price : null,
            sales_price: row.sales_price !== null && row.sales_price !== undefined ? row.sales_price : null,
            ops_price: row.ops_price !== null && row.ops_price !== undefined ? row.ops_price : null,
            currency: row.currency || "USD",
          },
        });

        successCount++;
      } catch (err: any) {
        processingErrors.push({
          row_number: rowNumber,
          message: err.message || "Failed to persist database record",
          hotel_name: row.hotel_name,
        });
      }
    }

    return NextResponse.json({
      success: successCount > 0,
      imported_count: successCount,
      failed_count: processingErrors.length,
      errors: processingErrors,
      message: `Bulk import finished: ${successCount} rate rows imported successfully, ${processingErrors.length} errors.`,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "DATA_OPERATOR"],
  }
);
