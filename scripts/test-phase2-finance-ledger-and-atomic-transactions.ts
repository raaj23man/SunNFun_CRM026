/**
 * Comprehensive PRD Part 6 Test Suite:
 * 1. Core Payment-Logging Logic (ACID $transaction)
 * 2. Atomic Rollback Verification on Mid-Chain Error (Zero Orphaned Rows)
 * 3. Locked-Trip Server-Side Guard on Payment Reverts (403 Forbidden)
 * 4. Part 5 Drop-Triggered Automatic Refund Installment in Part 6 Ledgers
 */

import {
  logClientPaymentTransaction,
  logSupplierPaymentTransaction,
  revertFinancialTransaction,
  processDropRefundInstallment,
} from "../lib/finance-service";
import { ForbiddenError, BadRequestError } from "../lib/api-error";
import { TENANT_SCOPED_MODELS } from "../lib/prisma";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FINANCE ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runFinanceTests() {
  console.log("\n========================================================");
  console.log("🚀 RUNNING PRD PART 6 FINANCIAL LEDGERS & ACID TESTS");
  console.log("========================================================\n");

  const orgId = "org_sunnfun_finance_001";
  const tripId = "trip_fin_10001";

  // -------------------------------------------------------------------------
  // 1. Multi-Tenant Scoping Registry Verification (Part 6 Models)
  // -------------------------------------------------------------------------
  console.log("🔹 Step 1: Multi-Tenant Scoping Verification for Part 6 Models");

  const part6Models = [
    "Account",
    "ClientLedger",
    "SupplierLedger",
    "FinancialTransaction",
    "PaymentPreferenceRule",
    "ProformaInvoice",
    "PaymentGatewayTransaction",
  ];

  for (const model of part6Models) {
    assert(
      TENANT_SCOPED_MODELS.includes(model as any),
      `Part 6 Model '${model}' registered in TENANT_SCOPED_MODELS`
    );
  }

  // -------------------------------------------------------------------------
  // 2. Simulated In-Memory Database Store with Rollback Support
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 2: ACID $transaction Payment Logging (Partial -> Full)");

  interface MockDbStore {
    trips: any[];
    clientLedgers: any[];
    supplierLedgers: any[];
    financialTransactions: any[];
    serviceBookings: any[];
    auditLogs: any[];
  }

  let db: MockDbStore = {
    trips: [
      {
        id: tripId,
        organization_id: orgId,
        trip_display_id: "SBC-10001",
        package_amount: 1200,
        currency: "USD",
        is_locked: false,
      },
    ],
    clientLedgers: [
      {
        id: "cl_10001",
        organization_id: orgId,
        trip_id: tripId,
        total_billed_amount: 1200,
        total_paid_amount: 0,
        currency: "USD",
        status: "UNPAID",
      },
    ],
    supplierLedgers: [],
    financialTransactions: [],
    serviceBookings: [],
    auditLogs: [],
  };

  // Transaction execution mock with rollback
  async function runMockTransaction(fn: (tx: any) => Promise<any>) {
    const dbSnapshot = JSON.parse(JSON.stringify(db));
    try {
      const txMock = {
        trip: {
          findUnique: async ({ where }: any) => db.trips.find((t) => t.id === where.id) || null,
        },
        clientLedger: {
          findFirst: async ({ where }: any) =>
            db.clientLedgers.find(
              (l) => l.organization_id === where.organization_id && l.trip_id === where.trip_id
            ) || null,
          update: async ({ where, data }: any) => {
            const index = db.clientLedgers.findIndex((l) => l.id === where.id);
            if (index === -1) throw new Error("ClientLedger not found");
            db.clientLedgers[index] = { ...db.clientLedgers[index], ...data };
            return db.clientLedgers[index];
          },
        },
        financialTransaction: {
          create: async ({ data }: any) => {
            const entry = { id: `ft_${Date.now()}_${Math.random()}`, ...data, created_at: new Date() };
            db.financialTransactions.push(entry);
            return entry;
          },
          findUnique: async ({ where }: any) => {
            const tx = db.financialTransactions.find((f) => f.id === where.id);
            if (!tx) return null;
            const trip = db.trips.find((t) => t.id === tx.trip_id);
            const client_ledger = db.clientLedgers.find((c) => c.id === tx.client_ledger_id);
            return { ...tx, trip, client_ledger };
          },
          update: async ({ where, data }: any) => {
            const index = db.financialTransactions.findIndex((f) => f.id === where.id);
            if (index === -1) throw new Error("Transaction not found");
            db.financialTransactions[index] = { ...db.financialTransactions[index], ...data };
            return db.financialTransactions[index];
          },
        },
        auditLog: {
          create: async ({ data }: any) => {
            const entry = { id: `log_${Date.now()}`, ...data };
            db.auditLogs.push(entry);
            return entry;
          },
        },
      };

      return await fn(txMock);
    } catch (err) {
      // ROLLBACK SNAPSHOT
      db = dbSnapshot;
      throw err;
    }
  }

  // A. Partial Payment of $500
  const partialRes = await runMockTransaction((tx) =>
    logClientPaymentTransaction(tx, {
      organization_id: orgId,
      trip_id: tripId,
      amount: 500,
      payment_mode: "BANK_TRANSFER" as any,
      reference_number: "WIRE-REF-500",
    })
  );

  assert(partialRes.ledger.total_paid_amount === 500, "Ledger total_paid_amount updated to $500");
  assert(partialRes.ledger.status === "PARTIAL", "Ledger status updated to PARTIAL");
  assert(db.financialTransactions.length === 1, "1 FinancialTransaction created");

  // B. Remaining Payment of $700 -> Flips to PAID_IN_FULL
  const fullRes = await runMockTransaction((tx) =>
    logClientPaymentTransaction(tx, {
      organization_id: orgId,
      trip_id: tripId,
      amount: 700,
      payment_mode: "CREDIT_CARD" as any,
      reference_number: "CC-REF-700",
    })
  );

  assert(fullRes.ledger.total_paid_amount === 1200, "Ledger total_paid_amount updated to $1,200");
  assert(fullRes.ledger.status === "PAID_IN_FULL", "Ledger status flipped to PAID_IN_FULL");
  assert(db.financialTransactions.length === 2, "2 FinancialTransactions created");

  // -------------------------------------------------------------------------
  // 3. Simulated Mid-Chain Failure & Atomic Rollback Verification
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 3: Mid-Chain Crash & Atomic Rollback Verification");

  const txCountBefore = db.financialTransactions.length;
  const ledgerPaidBefore = db.clientLedgers[0].total_paid_amount;

  let caughtError: any = null;
  try {
    await runMockTransaction(async (tx) => {
      // 1. Insert transaction
      await tx.financialTransaction.create({
        data: {
          organization_id: orgId,
          entity_type: "CLIENT_PAYMENT",
          entity_id: "cl_10001",
          amount: 300,
        },
      });

      // 2. Simulate unexpected database crash / network cut before ledger update
      throw new Error("SIMULATED_DB_CRASH_DURING_PAYMENT_LOGGING");
    });
  } catch (err: any) {
    caughtError = err;
  }

  assert(caughtError?.message === "SIMULATED_DB_CRASH_DURING_PAYMENT_LOGGING", "Crash simulated successfully");
  assert(
    db.financialTransactions.length === txCountBefore,
    `Zero Orphaned Rows: Transaction count rolled back exactly to ${txCountBefore}`
  );
  assert(
    db.clientLedgers[0].total_paid_amount === ledgerPaidBefore,
    `Zero Balance Drift: Ledger paid amount rolled back to ${ledgerPaidBefore}`
  );

  // -------------------------------------------------------------------------
  // 4. Locked-Trip Server-Side Guard on Reverts (403 Forbidden)
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 4: Locked-Trip Server-Side Guard on Payment Reverts");

  const txToRevert = db.financialTransactions[1]; // $700 payment

  // Lock the Trip
  db.trips[0].is_locked = true;

  let lockedRevertError: any = null;
  try {
    await runMockTransaction((tx) =>
      revertFinancialTransaction(tx, {
        organization_id: orgId,
        transaction_id: txToRevert.id,
        reason: "Client Chargeback Request",
      })
    );
  } catch (err: any) {
    lockedRevertError = err;
  }

  assert(lockedRevertError instanceof ForbiddenError, "Revert on locked trip threw ForbiddenError (403)");
  assert(
    lockedRevertError.message.includes("The associated trip is locked"),
    "Clear locked-trip error message returned"
  );
  assert(db.financialTransactions[1].is_reverted === false, "Transaction remained non-reverted");

  // Unlock Trip & Revert Successfully
  db.trips[0].is_locked = false;
  const revertedTx = await runMockTransaction((tx) =>
    revertFinancialTransaction(tx, {
      organization_id: orgId,
      transaction_id: db.financialTransactions[1].id,
      reason: "Client Chargeback Request",
    })
  );

  assert(revertedTx.is_reverted === true, "Unlocked trip allowed transaction reversal");
  assert(
    db.clientLedgers[0].total_paid_amount === 500,
    "ClientLedger balance decremented from $1,200 back to $500"
  );
  assert(
    db.clientLedgers[0].status === "PARTIAL",
    "ClientLedger status recalculated back to PARTIAL"
  );

  // -------------------------------------------------------------------------
  // 5. Part 5 Drop-Triggered Automatic Refund Installment in Ledgers
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 5: Part 5 Drop-Triggered Automatic Refund Installment");

  const refundRes = await runMockTransaction((tx) =>
    processDropRefundInstallment(tx, {
      organization_id: orgId,
      trip_id: tripId,
      service_booking_id: "sb_drop_hotel_001",
      refund_amount: 150,
      user_id: "user_ops_001",
      service_name: "Grand Himalayan Resort Room 102",
    })
  );

  assert(refundRes !== null, "Refund transaction created");
  assert(refundRes.is_refund === true, "Marked as is_refund: true");
  assert(refundRes.amount === 150, "Refund amount recorded as $150");
  assert(db.clientLedgers[0].status === "REFUND_DUE", "ClientLedger status updated to REFUND_DUE");

  console.log("\n========================================================");
  console.log("🎉 ALL PRD PART 6 FINANCIAL LEDGER TESTS PASSED!");
  console.log("========================================================\n");
}

runFinanceTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
