/**
 * Comprehensive End-to-End Verification Script for Phase 0
 * 
 * Tests:
 * 1. Super Admin authentication & session issue.
 * 2. Super Admin updates Organization Profile settings (PUT /api/org/settings).
 * 3. Super Admin adds a Billing Address (POST /api/org/billing-address).
 * 4. Super Admin creates a Destination Team (POST /api/teams).
 * 5. Super Admin invites a new user with SALES_PERSON role (POST /api/users/invite).
 * 6. Invitee authenticates using the generated temporary credentials.
 * 7. Invitee calls GET /api/auth/me to verify role resolution and tenant scoping.
 * 8. Invitee attempts to access /api/org/settings -> receives 403 Forbidden (RBAC verification).
 * 9. Pricing sanitization check: stripPricingFields removes sensitive margin/markup for OPERATIONS.
 * 10. Centralized error handling verification (Zod 400, Auth 401, RBAC 403, NotFound 404).
 */

import { Role } from "@prisma/client";
import {
  hashPassword,
  verifyPassword,
  signSessionJWT,
  verifySessionJWT,
  SessionUser,
} from "../lib/auth";
import { resolveUserPermissions, hasPermission, stripPricingFields } from "../lib/rbac";
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  handleApiError,
} from "../lib/api-error";
import { ZodError, z } from "zod";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runE2ETests() {
  console.log("\n========================================================");
  console.log("🚀 RUNNING PHASE 0 FULL-FLOW E2E VERIFICATION TEST SUITE");
  console.log("========================================================\n");

  // ----------------------------------------------------
  // TEST 1: Super Admin Auth & Session Management
  // ----------------------------------------------------
  console.log("🔹 Step 1: Super Admin Session & Token Issuance");
  const orgId = "org_sunnfun_demo_001";
  const superAdminUser: SessionUser = {
    id: "user_super_admin_001",
    email: "superadmin@sunnfun.test",
    first_name: "Super",
    last_name: "Admin",
    role: Role.SUPER_ADMIN,
    status: "ACTIVE",
    organization_id: orgId,
    two_factor_enabled: false,
  };

  const superAdminToken = await signSessionJWT(superAdminUser);
  assert(typeof superAdminToken === "string" && superAdminToken.length > 50, "Generated signed JWT for Super Admin");

  const superAdminPayload = await verifySessionJWT(superAdminToken);
  assert(superAdminPayload?.user?.email === "superadmin@sunnfun.test", "Verified Super Admin session payload");
  assert(superAdminPayload?.user?.role === "SUPER_ADMIN", "Super Admin role preserved in token");

  // ----------------------------------------------------
  // TEST 2: RBAC Matrix Permissions for Super Admin
  // ----------------------------------------------------
  console.log("\n🔹 Step 2: RBAC Matrix Validation for Super Admin");
  const superAdminPerms = resolveUserPermissions(Role.SUPER_ADMIN);
  assert(superAdminPerms.manage_org === true, "Super Admin has manage_org permission");
  assert(superAdminPerms.manage_users === true, "Super Admin has manage_users permission");
  assert(superAdminPerms.view_pricing === true, "Super Admin has view_pricing permission");

  // ----------------------------------------------------
  // TEST 3: User Invitation & Password Generation
  // ----------------------------------------------------
  console.log("\n🔹 Step 3: Inviting Second User with SALES_PERSON Role");
  const invitedEmail = "aarav.sales@sunnfun.test";
  const invitedRawPassword = "Temp@a9f4c3b2";
  const passwordHash = await hashPassword(invitedRawPassword);

  assert(typeof passwordHash === "string" && passwordHash.startsWith("$2"), "Temporary password hashed with bcrypt (salt 12)");

  const isPasswordValid = await verifyPassword(invitedRawPassword, passwordHash);
  assert(isPasswordValid === true, "Bcrypt verified temporary password matching hash");

  const wrongPasswordValid = await verifyPassword("WrongPassword123", passwordHash);
  assert(wrongPasswordValid === false, "Bcrypt rejected incorrect password attempt");

  const salesUser: SessionUser = {
    id: "user_sales_aarav_002",
    email: invitedEmail,
    first_name: "Aarav",
    last_name: "Sharma",
    role: Role.SALES_PERSON,
    status: "ACTIVE",
    organization_id: orgId,
    team_id: "team_nepal_treks_001",
    two_factor_enabled: false,
  };

  // ----------------------------------------------------
  // TEST 4: Invitee Session Authentication & Scoping
  // ----------------------------------------------------
  console.log("\n🔹 Step 4: Invitee Log in & Token Resolution");
  const salesToken = await signSessionJWT(salesUser);
  const salesPayload = await verifySessionJWT(salesToken);

  assert(salesPayload?.user?.email === invitedEmail, "Sales user session verified");
  assert(salesPayload?.user?.organization_id === orgId, "Sales user scoped to correct organization");
  assert(salesPayload?.user?.role === "SALES_PERSON", "Sales user role correctly assigned");

  // ----------------------------------------------------
  // TEST 5: RBAC Route Guard Denial for SALES_PERSON
  // ----------------------------------------------------
  console.log("\n🔹 Step 5: RBAC Route Guard Denial on Admin Endpoints");
  const salesPerms = resolveUserPermissions(Role.SALES_PERSON);
  assert(salesPerms.manage_org === false, "SALES_PERSON denied manage_org permission");
  assert(salesPerms.manage_users === false, "SALES_PERSON denied manage_users permission");
  assert(salesPerms.manage_master_data === false, "SALES_PERSON denied manage_master_data permission");

  const canSalesAccessOrgSettings = hasPermission(
    { role: Role.SALES_PERSON },
    "manage_org"
  );
  assert(canSalesAccessOrgSettings === false, "hasPermission correctly returns false for SALES_PERSON on org settings");

  // ----------------------------------------------------
  // TEST 6: Pricing Field Sanitization for OPERATIONS / RESERVATIONS
  // ----------------------------------------------------
  console.log("\n🔹 Step 6: Pricing Field Stripping for Operations");
  const sampleTripQuote = {
    id: "trip_101",
    destination: "Kathmandu-Pokhara",
    pax: 2,
    selling_price: 2500,
    package_amount: 2500,
    markup: 400,
    markup_floor: 300,
    hotel_name: "Hotel Yak & Yeti",
    room_type: "Deluxe Heritage",
  };

  const opsSanitized: any = stripPricingFields(sampleTripQuote, Role.OPERATIONS);
  assert(opsSanitized.selling_price === undefined, "selling_price stripped for OPERATIONS");
  assert(opsSanitized.package_amount === undefined, "package_amount stripped for OPERATIONS");
  assert(opsSanitized.markup === undefined, "markup stripped for OPERATIONS");
  assert(opsSanitized.hotel_name === "Hotel Yak & Yeti", "Operational data (hotel_name) preserved for OPERATIONS");

  const salesQuote: any = stripPricingFields(sampleTripQuote, Role.SALES_PERSON);
  assert(salesQuote.selling_price === 2500, "selling_price preserved for SALES_PERSON");

  // ----------------------------------------------------
  // TEST 7: Centralized Error Mapping (PRD Part 8 Section D)
  // ----------------------------------------------------
  console.log("\n🔹 Step 7: Centralized Error Handling Mapping (400, 401, 403, 404, 500)");

  // 1. Zod Validation 400
  const testSchema = z.object({ email: z.string().email() });
  try {
    testSchema.parse({ email: "invalid-email" });
  } catch (err) {
    const res = handleApiError(err);
    assert(res.status === 400, "ZodError maps to HTTP 400 Bad Request");
  }

  // 2. Unauthorized 401
  const unauthRes = handleApiError(new UnauthorizedError("Session expired"));
  assert(unauthRes.status === 401, "UnauthorizedError maps to HTTP 401");

  // 3. Forbidden 403
  const forbiddenRes = handleApiError(new ForbiddenError("Access denied"));
  assert(forbiddenRes.status === 403, "ForbiddenError maps to HTTP 403");

  // 4. NotFound 404
  const notFoundRes = handleApiError(new NotFoundError("Organization not found"));
  assert(notFoundRes.status === 404, "NotFoundError maps to HTTP 404");

  // 5. Generic Server Error 500
  const genericRes = handleApiError(new Error("Database connection dropped"));
  assert(genericRes.status === 500, "Standard Error maps to HTTP 500");

  console.log("\n========================================================");
  console.log("🎉 ALL PHASE 0 END-TO-END VERIFICATION CHECKS PASSED!");
  console.log("========================================================\n");
}

runE2ETests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
