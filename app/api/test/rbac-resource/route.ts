import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac, stripPricingFields } from "@/lib/rbac";

/**
 * Mock resource route simulating Trip / Quote resource access
 * to test RBAC guards and automatic pricing field sanitization.
 */
export const GET = withAuthAndRbac(
  async (req: NextRequest, { user, scopedPrisma }) => {
    // Simulated placeholder quote/trip object
    const mockTripRecord = {
      id: "trip-mock-12345",
      trip_display_id: "SBC-81881",
      organization_id: user.organization_id,
      assigned_to_user_id: user.id,
      guest_name: "John Doe",
      destination: "Kathmandu - Pokhara - Chitwan",
      // Sensitive pricing fields
      package_amount: 1450.0,
      selling_price: 1850.0,
      markup: 400.0,
      margin: "21.6%",
      // Operational fields
      hotel_name: "Yak & Yeti Hotel",
      room_type: "Deluxe Twin",
      status: "IN_PROGRESS",
    };

    // Apply automatic pricing field sanitization for restricted roles
    const sanitizedData = stripPricingFields(mockTripRecord, user.role);

    return NextResponse.json({
      success: true,
      role: user.role,
      user_id: user.id,
      data: sanitizedData,
    });
  }
);
