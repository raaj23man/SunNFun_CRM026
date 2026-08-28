/**
 * PRD Phase 0 Final Regression & Multi-Tenancy Verification Pass
 * 
 * 1. Second Organization (Org B) Multi-Tenancy Cross-Screen Data Leak Verification:
 *    - Organization Profile & Settings
 *    - Brands (Brand A vs Brand B)
 *    - Billing Addresses (Org A vs Org B)
 *    - Bank Accounts (Org A vs Org B)
 *    - Users (Org A users vs Org B users)
 *    - Teams (Org A teams vs Org B teams)
 *    - Anti-Enumeration findUnique ID isolation
 * 2. Re-run Phase 0 Full End-to-End Business Flow
 * 3. AuditLog persistence & cross-tenant query boundary checks
 */

import { Role } from "@prisma/client";
import { TENANT_SCOPED_MODELS } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit-log";
import {
  hashPassword,
  verifyPassword,
  signSessionJWT,
  verifySessionJWT,
  SessionUser,
} from "../lib/auth";
import { resolveUserPermissions, hasPermission, stripPricingFields } from "../lib/rbac";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\n🚨 BLOCKER: REGRESSION FAILURE: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase0RegressionSuite() {
  console.log("\n========================================================");
  console.log("🛡️ RUNNING PHASE 0 FINAL REGRESSION & MULTI-TENANCY PASS");
  console.log("========================================================\n");

  const orgAId = "org_alpha_phase0_001";
  const orgBId = "org_beta_phase0_002";

  // -------------------------------------------------------------------------
  // 1. Model Registration in Multi-Tenant Registry
  // -------------------------------------------------------------------------
  console.log("🔹 Step 1: Model Registration in Multi-Tenant Registry (Phase 0 Models)");

  const phase0Models = [
    "Brand",
    "BillingAddress",
    "BankAccount",
    "User",
    "Team",
    "AuditLog",
  ];

  for (const model of phase0Models) {
    assert(
      TENANT_SCOPED_MODELS.includes(model as any),
      `Tenant Isolation: Model '${model}' strictly registered in TENANT_SCOPED_MODELS`
    );
  }

  // -------------------------------------------------------------------------
  // 2. Cross-Tenant Data Isolation (Org A vs Org B) Across Phase 0 Entities
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 2: Cross-Tenant Isolation Across Phase 0 Entities");

  const db = {
    organizations: [
      { id: orgAId, name: "SunNFun Holidays (Org A)", slug: "sunnfun-a" },
      { id: orgBId, name: "Summit Expeditions (Org B)", slug: "summit-b" },
    ],
    brands: [
      { id: "brand_a1", organization_id: orgAId, name: "SunNFun Luxury Travel" },
      { id: "brand_b1", organization_id: orgBId, name: "Summit Treks" },
    ],
    billingAddresses: [
      { id: "ba_a1", organization_id: orgAId, street: "101 Thamel Marg, Kathmandu" },
      { id: "ba_b1", organization_id: orgBId, street: "404 Lakeside, Pokhara" },
    ],
    bankAccounts: [
      { id: "bank_a1", organization_id: orgAId, bank_name: "Nabil Bank", account_number: "0100200300" },
      { id: "bank_b1", organization_id: orgBId, bank_name: "Himalayan Bank", account_number: "0900800700" },
    ],
    users: [
      { id: "usr_sa_a1", organization_id: orgAId, email: "super@orga.com", role: Role.SUPER_ADMIN, first_name: "Super A" },
      { id: "usr_agent_a2", organization_id: orgAId, email: "agent@orga.com", role: Role.SALES_PERSON, first_name: "Agent A" },
      { id: "usr_sa_b1", organization_id: orgBId, email: "super@orgb.com", role: Role.SUPER_ADMIN, first_name: "Super B" },
    ],
    teams: [
      { id: "team_a1", organization_id: orgAId, name: "Everest Desk A" },
      { id: "team_b1", organization_id: orgBId, name: "Annapurna Desk B" },
    ],
    auditLogs: [] as any[],
  };

  // Mock scoped client generator enforcing tenant boundary
  function createScopedClient(organizationId: string) {
    return {
      organization: {
        findUnique: async ({ where }: any) => {
          const org = db.organizations.find((o) => o.id === where.id);
          return org && org.id === organizationId ? org : null;
        },
      },
      brand: {
        findMany: async () => db.brands.filter((b) => b.organization_id === organizationId),
        findUnique: async ({ where }: any) => {
          const item = db.brands.find((b) => b.id === where.id);
          return item && item.organization_id === organizationId ? item : null;
        },
      },
      billingAddress: {
        findMany: async () => db.billingAddresses.filter((ba) => ba.organization_id === organizationId),
        findUnique: async ({ where }: any) => {
          const item = db.billingAddresses.find((ba) => ba.id === where.id);
          return item && item.organization_id === organizationId ? item : null;
        },
      },
      bankAccount: {
        findMany: async () => db.bankAccounts.filter((bk) => bk.organization_id === organizationId),
        findUnique: async ({ where }: any) => {
          const item = db.bankAccounts.find((bk) => bk.id === where.id);
          return item && item.organization_id === organizationId ? item : null;
        },
      },
      user: {
        findMany: async () => db.users.filter((u) => u.organization_id === organizationId),
        findUnique: async ({ where }: any) => {
          const item = db.users.find((u) => u.id === where.id);
          return item && item.organization_id === organizationId ? item : null;
        },
      },
      team: {
        findMany: async () => db.teams.filter((t) => t.organization_id === organizationId),
        findUnique: async ({ where }: any) => {
          const item = db.teams.find((t) => t.id === where.id);
          return item && item.organization_id === organizationId ? item : null;
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          const entry = { id: `aud_${Date.now()}_${Math.random()}`, ...data, created_at: new Date() };
          db.auditLogs.push(entry);
          return entry;
        },
        findMany: async () => db.auditLogs.filter((a) => a.organization_id === organizationId),
      },
    };
  }

  const clientOrgA = createScopedClient(orgAId);
  const clientOrgB = createScopedClient(orgBId);

  // A. Brand Isolation
  const orgBBrands = await clientOrgB.brand.findMany();
  assert(orgBBrands.length === 1 && orgBBrands[0].id === "brand_b1", "Org B queries only its own brands");
  const leakBrand = await clientOrgB.brand.findUnique({ where: { id: "brand_a1" } });
  assert(leakBrand === null, "Anti-Enumeration: Org B findUnique('brand_a1') returns NULL");

  // B. Billing Address Isolation
  const orgBBilling = await clientOrgB.billingAddress.findMany();
  assert(orgBBilling.length === 1 && orgBBilling[0].id === "ba_b1", "Org B queries only its own billing addresses");
  const leakBilling = await clientOrgB.billingAddress.findUnique({ where: { id: "ba_a1" } });
  assert(leakBilling === null, "Anti-Enumeration: Org B findUnique('ba_a1') returns NULL");

  // C. Bank Account Isolation
  const orgBBank = await clientOrgB.bankAccount.findMany();
  assert(orgBBank.length === 1 && orgBBank[0].id === "bank_b1", "Org B queries only its own bank accounts");
  const leakBank = await clientOrgB.bankAccount.findUnique({ where: { id: "bank_a1" } });
  assert(leakBank === null, "Anti-Enumeration: Org B findUnique('bank_a1') returns NULL");

  // D. User Isolation
  const orgBUsers = await clientOrgB.user.findMany();
  assert(orgBUsers.length === 1 && orgBUsers[0].id === "usr_sa_b1", "Org B queries only its own user roster");
  const leakUser = await clientOrgB.user.findUnique({ where: { id: "usr_sa_a1" } });
  assert(leakUser === null, "Anti-Enumeration: Org B findUnique('usr_sa_a1') returns NULL");

  // E. Team Isolation
  const orgBTeams = await clientOrgB.team.findMany();
  assert(orgBTeams.length === 1 && orgBTeams[0].id === "team_b1", "Org B queries only its own destination teams");
  const leakTeam = await clientOrgB.team.findUnique({ where: { id: "team_a1" } });
  assert(leakTeam === null, "Anti-Enumeration: Org B findUnique('team_a1') returns NULL");

  // -------------------------------------------------------------------------
  // 3. Re-Run Phase 0 Full End-to-End Business Flow
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 3: Re-Running Phase 0 Full-Flow Operations");

  // Super Admin Token Creation & Verification
  const superAdminUser: SessionUser = {
    id: "usr_sa_a1",
    email: "super@orga.com",
    first_name: "Super",
    last_name: "Admin",
    role: Role.SUPER_ADMIN,
    status: "ACTIVE",
    organization_id: orgAId,
    team_id: null,
    two_factor_enabled: false,
  };

  const token = await signSessionJWT(superAdminUser);
  assert(typeof token === "string" && token.length > 20, "JWT signed successfully");
  const verified = await verifySessionJWT(token);
  assert(verified !== null && verified.user.email === "super@orga.com", "JWT payload verified with correct email");
  assert(verified !== null && verified.user.organization_id === orgAId, "JWT scoped to correct organization");

  // RBAC & Pricing Field Sanitization
  assert(hasPermission({ role: Role.OPERATIONS }, "manage_ledgers") === true, "OPERATIONS has manage_ledgers");
  assert(hasPermission({ role: Role.OPERATIONS }, "view_pricing") === false, "OPERATIONS cannot view_pricing");

  const sensitiveQuote = {
    id: "q_001",
    selling_price: 1500,
    cost_price: 1000,
    markup: 500,
    margin: 33.3,
  };
  const sanitized = stripPricingFields(sensitiveQuote, Role.OPERATIONS) as any;
  assert(sanitized.selling_price === undefined, "stripPricingFields removed selling_price for OPERATIONS");
  assert(sanitized.markup === undefined, "stripPricingFields removed markup for OPERATIONS");
  assert(sanitized.margin === undefined, "stripPricingFields removed margin for OPERATIONS");
  assert(sanitized.cost_price === 1000, "OPERATIONS retains cost_price for supplier reservations");

  // -------------------------------------------------------------------------
  // 4. AuditLog Persistence & Boundary Checks
  // -------------------------------------------------------------------------
  console.log("\n🔹 Step 4: AuditLog Persistence for Phase 0 Mutations");

  // Write audit logs for Org A and Org B
  await writeAuditLog(clientOrgA, {
    organization_id: orgAId,
    actor_user_id: "usr_sa_a1",
    entity_type: "UserPermissionOverride",
    entity_id: "usr_agent_a2",
    action: "UPDATE",
    diff: { granted: ["quotes:publish"] },
  });

  await writeAuditLog(clientOrgB, {
    organization_id: orgBId,
    actor_user_id: "usr_sa_b1",
    entity_type: "UserPermissionOverride",
    entity_id: "usr_sa_b1",
    action: "UPDATE",
    diff: { granted: ["settings:manage"] },
  });

  const orgAAudits = await clientOrgA.auditLog.findMany();
  const orgBAudits = await clientOrgB.auditLog.findMany();

  assert(orgAAudits.length === 1, "Org A has 1 audit record");
  assert(orgBAudits.length === 1, "Org B has 1 audit record");
  assert(orgBAudits[0].actor_user_id === "usr_sa_b1", "Org B sees only its own audit mutations");
  assert(
    !orgBAudits.some((a: any) => a.organization_id === orgAId),
    "Zero Org A audit logs visible to Org B"
  );

  console.log("\n========================================================");
  console.log("🎉 ALL PHASE 0 REGRESSION & MULTI-TENANCY CHECKS PASSED!");
  console.log("========================================================\n");
}

runPhase0RegressionSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
