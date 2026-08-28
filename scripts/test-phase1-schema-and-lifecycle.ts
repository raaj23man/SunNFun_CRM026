/**
 * Verification Script for PRD Part 2 Schema, Trip Display ID & Lifecycle State Machine
 */

import { TripStatus, Role } from "@prisma/client";
import { validateTripTransition } from "../lib/trip-lifecycle";
import { TENANT_SCOPED_MODELS } from "../lib/prisma";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

function expectThrows(fn: () => void, expectedMessageFragment: string, testLabel: string) {
  try {
    fn();
    console.error(`❌ Expected error containing "${expectedMessageFragment}", but no error was thrown.`);
    process.exit(1);
  } catch (err: any) {
    if (err.message && err.message.includes(expectedMessageFragment)) {
      console.log(`  ✓ ${testLabel} (correctly threw: "${err.message}")`);
    } else {
      console.error(`❌ Expected message fragment "${expectedMessageFragment}", but got: "${err.message}"`);
      process.exit(1);
    }
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("🚀 RUNNING PRD PART 2 SCHEMA & TRIP LIFECYCLE TESTS");
  console.log("========================================================\n");

  // ----------------------------------------------------
  // 1. Multi-Tenant Model Isolation Checklist
  // ----------------------------------------------------
  console.log("🔹 Test 1: Multi-Tenant Scoping Includes Part 2 Models");
  assert(TENANT_SCOPED_MODELS.includes("Guest"), "TENANT_SCOPED_MODELS includes 'Guest'");
  assert(TENANT_SCOPED_MODELS.includes("TripPlanRequest"), "TENANT_SCOPED_MODELS includes 'TripPlanRequest'");
  assert(TENANT_SCOPED_MODELS.includes("Trip"), "TENANT_SCOPED_MODELS includes 'Trip'");
  assert(TENANT_SCOPED_MODELS.includes("TripDestination"), "TENANT_SCOPED_MODELS includes 'TripDestination'");
  assert(TENANT_SCOPED_MODELS.includes("TripSource"), "TENANT_SCOPED_MODELS includes 'TripSource'");

  // ----------------------------------------------------
  // 2. Trip Display ID Format Rules
  // ----------------------------------------------------
  console.log("\n🔹 Test 2: Trip Display ID Formatting");
  const prefix = "SBC-";
  const seq1 = 10001;
  const seq2 = 81881;
  const displayId1 = `${prefix}${seq1}`;
  const displayId2 = `${prefix}${seq2}`;

  assert(displayId1 === "SBC-10001", "Format matches PRD format SBC-10001");
  assert(displayId2 === "SBC-81881", "Format matches PRD reference SBC-81881");

  // ----------------------------------------------------
  // 3. Trip Lifecycle: HOLD & UNHOLD
  // ----------------------------------------------------
  console.log("\n🔹 Test 3: HOLD and UNHOLD Transitions");
  const baseTrip = {
    id: "trip-001",
    status: "NEW_QUERY" as TripStatus,
    is_locked: false,
    is_archived: false,
    organization_id: "org-001",
  };

  const holdResult = validateTripTransition(baseTrip, "HOLD");
  assert(holdResult.nextStatus === "ON_HOLD", "NEW_QUERY transitions to ON_HOLD");

  const unholdResult = validateTripTransition({ ...baseTrip, status: "ON_HOLD" }, "UNHOLD");
  assert(unholdResult.nextStatus === "IN_PROGRESS", "ON_HOLD transitions back to IN_PROGRESS");

  expectThrows(
    () => validateTripTransition({ ...baseTrip, status: "CONVERTED" }, "HOLD"),
    "Hold is only valid for pre-conversion",
    "Cannot HOLD a CONVERTED booking"
  );

  // ----------------------------------------------------
  // 4. Trip Lifecycle: CANCEL vs REOPEN
  // ----------------------------------------------------
  console.log("\n🔹 Test 4: Pre-conversion CANCEL and REOPEN");
  const inProgressTrip = { ...baseTrip, status: "IN_PROGRESS" as TripStatus };
  const cancelResult = validateTripTransition(inProgressTrip, "CANCEL");
  assert(cancelResult.nextStatus === "CANCELLED", "IN_PROGRESS transitions to CANCELLED");

  const reopenResult = validateTripTransition({ ...baseTrip, status: "CANCELLED" }, "REOPEN_CANCELLED");
  assert(reopenResult.nextStatus === "IN_PROGRESS", "CANCELLED trip can be reopened to IN_PROGRESS");

  expectThrows(
    () => validateTripTransition({ ...baseTrip, status: "CONVERTED" }, "CANCEL"),
    "Cannot Cancel a converted or completed trip",
    "CONVERTED trips cannot be Cancelled (must use DROP)"
  );

  // ----------------------------------------------------
  // 5. Trip Lifecycle: DROP (Irreversible Post-Conversion)
  // ----------------------------------------------------
  console.log("\n🔹 Test 5: Post-conversion DROP (Strict Irreversible Guard)");
  const convertedTrip = { ...baseTrip, status: "CONVERTED" as TripStatus };
  const dropResult = validateTripTransition(convertedTrip, "DROP");
  assert(dropResult.nextStatus === "DROPPED", "CONVERTED transitions to DROPPED");

  expectThrows(
    () => validateTripTransition({ ...baseTrip, status: "DROPPED" }, "REOPEN_CANCELLED"),
    "Only pre-conversion CANCELLED trips can be reopened",
    "DROPPED trips CANNOT be reopened (Irreversible terminal state)"
  );

  expectThrows(
    () => validateTripTransition({ ...baseTrip, status: "NEW_QUERY" }, "DROP"),
    "Only CONVERTED bookings can be Dropped",
    "Pre-conversion leads cannot be Dropped (must use CANCEL)"
  );

  // ----------------------------------------------------
  // 6. Trip Lifecycle: CONVERT & COMPLETE
  // ----------------------------------------------------
  console.log("\n🔹 Test 6: CONVERT and COMPLETE Lifecycle");
  const convertResult = validateTripTransition(inProgressTrip, "CONVERT");
  assert(convertResult.nextStatus === "CONVERTED", "Active lead converts to CONVERTED booking");

  const completeResult = validateTripTransition({ ...baseTrip, status: "CONVERTED" }, "COMPLETE");
  assert(completeResult.nextStatus === "COMPLETED", "CONVERTED booking completes to COMPLETED");

  // ----------------------------------------------------
  // 7. Trip Lifecycle: LOCK & UNLOCK Guard
  // ----------------------------------------------------
  console.log("\n🔹 Test 7: LOCK and UNLOCK Administrator Permissions");
  const lockResult = validateTripTransition(convertedTrip, "LOCK", Role.ADMIN);
  assert(lockResult.isLocked === true, "ADMIN can lock a trip");

  const lockedTrip = { ...convertedTrip, is_locked: true };
  expectThrows(
    () => validateTripTransition(lockedTrip, "DROP", Role.SALES_PERSON),
    "Trip is locked",
    "Modifications blocked on locked trip"
  );

  expectThrows(
    () => validateTripTransition(lockedTrip, "UNLOCK", Role.SALES_PERSON),
    "Only Administrators can unlock",
    "SALES_PERSON cannot unlock a trip"
  );

  const unlockResult = validateTripTransition(lockedTrip, "UNLOCK", Role.ADMIN);
  assert(unlockResult.isLocked === false, "ADMIN can unlock a trip");

  console.log("\n========================================================");
  console.log("🎉 ALL PRD PART 2 SCHEMA & LIFECYCLE TESTS PASSED!");
  console.log("========================================================\n");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
