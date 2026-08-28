/**
 * PRD Part 7 AI Email Parsing Test Suite:
 * 1. High-Confidence Extraction (>= threshold) -> Auto-creates TripPlanRequest & marks PARSED
 * 2. Low-Confidence Extraction (< threshold) -> Flags LOW_CONFIDENCE_NEEDS_REVIEW & ZERO TRIPS CREATED
 * 3. Raw Email Body Preservation guarantee across all parse outcomes
 * 4. Error recovery on failure
 */

import { processEmailThreadParsing } from "../lib/ai-email-parser";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ AI EMAIL PARSE ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runAIEmailParseTests() {
  console.log("\n========================================================");
  console.log("🚀 RUNNING PRD PART 7 AI EMAIL PARSING TEST SUITE");
  console.log("========================================================\n");

  const orgId = "org_ai_parse_001";

  // Simulated Database Store
  const db = {
    emailThreads: [] as any[],
    tripPlanRequests: [] as any[],
    trips: [] as any[], // Must remain 0 for AI email parser
  };

  const mockDbClient = {
    emailThread: {
      create: async ({ data }: any) => {
        const entry = { id: `et_${Date.now()}_${Math.random()}`, ...data, created_at: new Date() };
        db.emailThreads.push(entry);
        return entry;
      },
      update: async ({ where, data }: any) => {
        const idx = db.emailThreads.findIndex((e) => e.id === where.id);
        db.emailThreads[idx] = { ...db.emailThreads[idx], ...data };
        return db.emailThreads[idx];
      },
    },
    tripPlanRequest: {
      create: async ({ data }: any) => {
        const entry = { id: `tpr_${Date.now()}_${Math.random()}`, ...data, created_at: new Date() };
        db.tripPlanRequests.push(entry);
        return entry;
      },
    },
    trip: {
      create: async () => {
        throw new Error("VIOLATION: AI Email Parser must NEVER directly create a Trip!");
      },
    },
  };

  // -------------------------------------------------------------------------
  // 1. High-Confidence Extraction Test
  // -------------------------------------------------------------------------
  console.log("🔹 Step 1: High-Confidence Structured Extraction (>= 0.75)");

  const highConfidenceEmail = {
    organization_id: orgId,
    from_address: "robert.vance@vancerefrigeration.com",
    subject: "Nepal Tour Inquiry for 4 pax in October",
    body_text: "Hi Team, Name: Robert Vance. Phone: +1 415-555-2671. We are 4 adults looking for a 7-day Kathmandu and Pokhara luxury tour in October 2026. Our estimated budget is around $1200 per person.",
    raw_message_id: "<msg_high_001@mail.gmail.com>",
    confidence_threshold: 0.75,
  };

  const highRes = await processEmailThreadParsing(highConfidenceEmail, mockDbClient);

  assert(highRes.success === true, "High-confidence email processed successfully");
  assert(highRes.ai_parse_status === "PARSED", "Status is PARSED");
  assert((highRes.confidence_score ?? 0) >= 0.75, `Confidence score (${highRes.confidence_score}) meets threshold`);
  assert(highRes.trip_plan_request_id !== null, "TripPlanRequest created in pipeline");
  assert(db.trips.length === 0, "No Trip records created");
  assert(
    db.emailThreads[0].body_text === highConfidenceEmail.body_text,
    "Raw email body text preserved verbatim"
  );

  // -------------------------------------------------------------------------
  // 2. Low-Confidence Extraction Test (< threshold)
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 2: Low-Confidence Extraction & Human Review Flagging");

  const lowConfidenceEmail = {
    organization_id: orgId,
    from_address: "curious.traveler@yahoo.com",
    subject: "Quick question",
    body_text: "Hey, do you have any trips available sometime next year? Thanks.",
    raw_message_id: "<msg_low_002@yahoo.com>",
    confidence_threshold: 0.75,
  };

  const lowRes = await processEmailThreadParsing(lowConfidenceEmail, mockDbClient);

  assert(lowRes.success === true, "Low-confidence email captured safely");
  assert(
    lowRes.ai_parse_status === "LOW_CONFIDENCE_NEEDS_REVIEW",
    "Status flagged as LOW_CONFIDENCE_NEEDS_REVIEW"
  );
  assert((lowRes.confidence_score ?? 0) < 0.75, `Confidence score (${lowRes.confidence_score}) below threshold`);
  assert(
    lowRes.trip_plan_request_id !== null,
    "Flagged TripPlanRequest created for human inbox review"
  );

  // CRITICAL SPEC REQUIREMENT: Confirm zero Trips created below threshold
  assert(
    db.trips.length === 0,
    "CRITICAL GUARD: Zero fully-qualified Trips created on low-confidence email"
  );
  assert(
    db.emailThreads[1].body_text === lowConfidenceEmail.body_text,
    "Raw email body preserved for human review"
  );

  // -------------------------------------------------------------------------
  // 3. Parse Failure & Error Resilience Test
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 3: Parse Failure Resilience");

  const failingMockDb = {
    emailThread: {
      create: async ({ data }: any) => ({ id: "et_fail_001", ...data }),
      update: async ({ data }: any) => ({ id: "et_fail_001", ...data }),
    },
    tripPlanRequest: {
      create: async () => {
        throw new Error("Simulated Database write error during plan request generation");
      },
    },
  };

  const failRes = await processEmailThreadParsing(
    {
      organization_id: orgId,
      from_address: "error.test@example.com",
      subject: "Test Crash",
      body_text: "Crash simulation body text",
    },
    failingMockDb
  );

  assert(failRes.success === false, "Handled database crash gracefully");
  assert(failRes.ai_parse_status === "FAILED", "Status set to FAILED on crash");
  assert(failRes.raw_email_preserved === true, "Raw email preserved even on fatal parse failure");

  console.log("\n========================================================");
  console.log("🎉 ALL PRD PART 7 AI EMAIL PARSING TESTS PASSED!");
  console.log("========================================================\n");
}

runAIEmailParseTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
