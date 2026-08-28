import { NextRequest, NextResponse } from "next/server";
import { withAuthAndRbac } from "@/lib/rbac";
import { getQuoteSuggestionsV2 } from "@/lib/ai-quote-suggestions";

/**
 * GET /api/quotes/ai-suggestions
 * Quote Suggestions v2: Returns semantic embedding-ranked past ACCEPTED quotes with fallback to filter.
 */
export const GET = withAuthAndRbac(
  async (req, { user, scopedPrisma }) => {
    const { searchParams } = new URL(req.url);
    const destinationId = searchParams.get("destination_id");
    const destinationText = searchParams.get("destination_text");
    const durationNights = searchParams.get("duration_nights")
      ? parseInt(searchParams.get("duration_nights")!, 10)
      : null;
    const pax = searchParams.get("pax") ? parseInt(searchParams.get("pax")!, 10) : null;
    const budgetHint = searchParams.get("budget_hint");
    const tripNotes = searchParams.get("trip_notes");

    const result = await getQuoteSuggestionsV2(
      {
        organization_id: user.organization_id,
        actor_user_id: user.id,
        destination_id: destinationId,
        destination_text: destinationText,
        duration_nights: durationNights,
        pax,
        budget_hint: budgetHint,
        trip_notes: tripNotes,
      },
      scopedPrisma
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  },
  {
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES_HEAD", "SALES_PERSON", "OPERATIONS"],
  }
);
