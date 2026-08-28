/**
 * PRD Part 9 AI Architecture, Auditing & Human Feedback Loop Test Suite:
 * 1. AIActionLog multi-tenant model registration
 * 2. Automatic AIActionLog persistence across AI actions (Email Parsing & Quote Suggestions v2)
 * 3. Quote Suggestions v2 semantic embedding ranking with clean fallback to Part 4 filter
 * 4. Human Decision feedback updates (APPROVED, EDITED, REJECTED)
 * 5. Blocker verification: Zero autonomous auto-sends without human approval
 */

import { TENANT_SCOPED_MODELS } from "../lib/prisma";
import { getQuoteSuggestionsV2 } from "../lib/ai-quote-suggestions";
import { logAIAction, recordHumanDecision } from "../lib/ai-action-logger";
import { AIActionType, AIHumanDecision } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ PRD PART 9 ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runPart9Tests() {
  console.log("\n========================================================");
  console.log("🚀 RUNNING PRD PART 9 AI ACTION LOGS & EMBEDDINGS SUITE");
  console.log("========================================================\n");

  const orgId = "org_ai_part9_001";
  const userId = "usr_agent_001";

  // -------------------------------------------------------------------------
  // 1. Multi-Tenant Scoping Registry Verification
  // -------------------------------------------------------------------------
  console.log("🔹 Step 1: Multi-Tenant Scoping Verification");

  assert(
    TENANT_SCOPED_MODELS.includes("AIActionLog" as any),
    "Model 'AIActionLog' registered in TENANT_SCOPED_MODELS"
  );

  // -------------------------------------------------------------------------
  // 2. Simulated In-Memory Database Store
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 2: Quote Suggestions v2 (Embedding Ranking & Filter Fallback)");

  const db = {
    aiActionLogs: [] as any[],
    quotes: [
      {
        id: "quote_past_nepal_001",
        organization_id: orgId,
        status: "ACCEPTED",
        total_selling_price: 2400,
        currency: "USD",
        notes: "5N/6D Kathmandu Pokhara luxury tour for 2 pax",
        trip: {
          trip_display_id: "SNF-9001",
          duration_nights: 5,
          duration_days: 6,
          pax_adults: 2,
          destination: { name: "Kathmandu & Pokhara" },
          guest: { full_name: "John Smith" },
        },
        options: [
          {
            option_label: "Standard 4-Star",
            total_selling_price: 2400,
            days: [{}, {}, {}, {}, {}, {}],
          },
        ],
      },
      {
        id: "quote_past_everest_002",
        organization_id: orgId,
        status: "ACCEPTED",
        total_selling_price: 4500,
        currency: "USD",
        notes: "12N/13D Everest Base Camp Trek",
        trip: {
          trip_display_id: "SNF-9002",
          duration_nights: 12,
          duration_days: 13,
          pax_adults: 2,
          destination: { name: "Everest Base Camp" },
          guest: { full_name: "Alice Walker" },
        },
        options: [
          {
            option_label: "Trek Option",
            total_selling_price: 4500,
            days: new Array(13).fill({}),
          },
        ],
      },
    ],
  };

  const mockDbClient = {
    quote: {
      findMany: async ({ where }: any) => {
        return db.quotes.filter((q) => q.organization_id === where.organization_id && q.status === where.status);
      },
    },
    aIActionLog: {
      create: async ({ data }: any) => {
        const entry = { id: `ai_log_${Date.now()}_${Math.random()}`, ...data, created_at: new Date() };
        db.aiActionLogs.push(entry);
        return entry;
      },
      update: async ({ where, data }: any) => {
        const idx = db.aiActionLogs.findIndex((l) => l.id === where.id);
        db.aiActionLogs[idx] = { ...db.aiActionLogs[idx], ...data };
        return db.aiActionLogs[idx];
      },
    },
  };

  // A. High Similarity Ranking Test
  const resSimilar = await getQuoteSuggestionsV2(
    {
      organization_id: orgId,
      actor_user_id: userId,
      destination_text: "Kathmandu and Pokhara tour",
      duration_nights: 5,
      pax: 2,
      budget_hint: "$2,500",
    },
    mockDbClient
  );

  assert(resSimilar.suggestions.length > 0, "Suggestions returned for Kathmandu Pokhara inquiry");
  assert(resSimilar.source === "AI_EMBEDDING_RANKED", "Source identified as AI_EMBEDDING_RANKED");
  assert(resSimilar.suggestions[0].quote_id === "quote_past_nepal_001", "Top match is 5N/6D Kathmandu Pokhara quote");
  assert(resSimilar.suggestions[0].similarity_score > 0.7, "Top match similarity score > 0.7");
  assert(resSimilar.ai_action_log_id !== null, "AI Action Log ID generated and linked");

  // B. Clean Fallback Test (Different destination returning fallback)
  const resFallback = await getQuoteSuggestionsV2(
    {
      organization_id: orgId,
      actor_user_id: userId,
      destination_text: "Bali Beach Villa Holiday",
      duration_nights: 7,
      pax: 4,
    },
    mockDbClient
  );

  assert(resFallback.suggestions.length > 0, "Fallback suggestions returned without error");
  assert(resFallback.source === "FILTER_FALLBACK", "Clean fallback to FILTER_FALLBACK when no embedding match found");

  // -------------------------------------------------------------------------
  // 3. Human Decision Feedback Loop
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 3: Human Decision Feedback Loop (Audit & Learning)");

  const actionLogId = resSimilar.ai_action_log_id!;
  const initialLog = db.aiActionLogs.find((l) => l.id === actionLogId);
  assert(initialLog.human_decision === "PENDING", "Initial AI Action status is PENDING");

  // Human Agent edits price by +$100 and approves
  const updatedLog = await recordHumanDecision(
    {
      action_log_id: actionLogId,
      organization_id: orgId,
      user_id: userId,
      decision: AIHumanDecision.EDITED,
      diff: { price_adjustment: "+100", reason: "Peak season hotel surcharge" },
    },
    mockDbClient
  );

  assert(updatedLog.human_decision === "EDITED", "human_decision updated to EDITED");
  assert(updatedLog.human_decision_user_id === userId, "Reviewing user ID recorded");
  assert(updatedLog.human_decision_at instanceof Date, "Timestamp recorded for human decision");
  assert(
    updatedLog.human_decision_diff?.reason === "Peak season hotel surcharge",
    "Human feedback diff preserved for model fine-tuning"
  );

  // -------------------------------------------------------------------------
  // 4. Autonomous Auto-Send Guard Verification
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 4: Autonomous Auto-Send Blocker Verification");

  assert(
    db.aiActionLogs.every((l) => l.human_decision !== "AUTO_APPROVED"),
    "CRITICAL SPEC GUARD: Zero AI actions auto-approved or autonomously sent"
  );

  console.log("\n========================================================");
  console.log("🎉 ALL PRD PART 9 AI ACTION LOG & EMBEDDING TESTS PASSED!");
  console.log("========================================================\n");
}

runPart9Tests().catch((err) => {
  console.error(err);
  process.exit(1);
});
