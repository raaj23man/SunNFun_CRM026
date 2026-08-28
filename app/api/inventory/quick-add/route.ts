import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndRbac } from "@/lib/rbac";
import { BadRequestError } from "@/lib/api-error";

const quickAddSchema = z.object({
  type: z.enum(["HOTEL", "TRANSPORT", "ACTIVITY"]),
  name: z.string().min(1, "Name is required"),
  destination_id: z.string().min(1, "Destination ID is required"),
  cost_price: z.number().nonnegative().default(0),
  selling_price: z.number().nonnegative().optional(),
  star_rating: z.number().int().min(1).max(5).optional(),
  room_type: z.string().optional(),
});

/**
 * POST /api/inventory/quick-add
 * Quick-add endpoint used directly from the Quote Builder.
 * Creates master data records on-the-fly and returns the newly minted item.
 */
export const POST = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const body = await req.json();
    const validated = quickAddSchema.parse(body);

    if (validated.type === "HOTEL") {
      const hotel = await scopedPrisma.hotel.create({
        data: {
          organization_id: user.organization_id,
          destination_id: validated.destination_id,
          name: validated.name,
          star_rating: validated.star_rating || 4,
          entry_method: "MANUAL",
          rooms: {
            create: {
              room_type: validated.room_type || "Deluxe Room",
              meal_plan: "CP",
              total_room_count: 10,
              max_occupancy: 2,
            },
          },
        },
        include: {
          rooms: true,
          destination: true,
        },
      });

      return NextResponse.json({
        success: true,
        item: {
          id: hotel.id,
          name: hotel.name,
          type: "HOTEL",
          cost_price: validated.cost_price,
          selling_price: validated.selling_price || validated.cost_price,
          metadata: { star_rating: hotel.star_rating, room_id: hotel.rooms[0]?.id },
        },
      });
    } else if (validated.type === "TRANSPORT") {
      const transport = await scopedPrisma.transportService.create({
        data: {
          organization_id: user.organization_id,
          destination_id: validated.destination_id,
          cab_type: validated.name,
          billing_metric: "PER_SERVICE",
          capacity: 4,
        },
        include: { destination: true },
      });

      return NextResponse.json({
        success: true,
        item: {
          id: transport.id,
          name: transport.cab_type,
          type: "TRANSPORT",
          cost_price: validated.cost_price,
          selling_price: validated.selling_price || validated.cost_price,
        },
      });
    } else {
      // ACTIVITY
      const activity = await scopedPrisma.travelActivity.create({
        data: {
          organization_id: user.organization_id,
          destination_id: validated.destination_id,
          name: validated.name,
          ticket_type: "PER_PERSON",
        },
        include: { destination: true },
      });

      return NextResponse.json({
        success: true,
        item: {
          id: activity.id,
          name: activity.name,
          type: "ACTIVITY",
          cost_price: validated.cost_price,
          selling_price: validated.selling_price || validated.cost_price,
        },
      });
    }
  },
  {
    allowedRoles: [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_HEAD",
      "SALES_PERSON",
      "OPERATIONS",
      "DATA_OPERATOR",
    ],
  }
);
