/**
 * Verification test script for Auth Flows, WebAuthn, 2FA, and RBAC Guards
 */

import { Role, UserStatus } from "@prisma/client";
import {
  hashPassword,
  verifyPassword,
  signSessionJWT,
  verifySessionJWT,
  sign2FATempToken,
  verify2FATempToken,
  verifyTOTP,
  generateCurrentTOTPToken,
  createWebAuthnRegistrationOptions,
  createWebAuthnAuthenticationOptions,
  SessionUser,
} from "../lib/auth";
import {
  resolveUserPermissions,
  hasPermission,
  stripPricingFields,
  DEFAULT_ROLE_PERMISSIONS,
} from "../lib/rbac";

async function runAuthAndRbacTests() {
  console.log("==================================================");
  console.log("🧪 TESTING AUTH FLOWS, 2FA, WEBAUTHN & RBAC GUARDS");
  console.log("==================================================");

  // 1. Test Password Hashing & Verification
  console.log("\n[Test 1] Testing password hashing with bcryptjs...");
  const rawPassword = "Password123!";
  const hash = await hashPassword(rawPassword);
  const isMatch = await verifyPassword(rawPassword, hash);
  const isWrongMatch = await verifyPassword("WrongPassword!", hash);

  if (isMatch && !isWrongMatch) {
    console.log("✅ Test 1 PASSED: Password hashing and validation verified.");
  } else {
    console.error("❌ Test 1 FAILED: Password comparison failed.");
    process.exit(1);
  }

  // 2. Test Session JWT Generation & Verification
  console.log("\n[Test 2] Testing stateless JWT session tokens...");
  const mockUser: SessionUser = {
    id: "user-1234-5678",
    email: "admin@sunnfunholidays.com",
    first_name: "Rajesh",
    last_name: "Bhandari",
    role: Role.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    organization_id: "org-1111-2222",
    two_factor_enabled: false,
  };

  const sessionToken = await signSessionJWT(mockUser);
  const decodedPayload = await verifySessionJWT(sessionToken);

  if (
    decodedPayload &&
    decodedPayload.user.email === mockUser.email &&
    decodedPayload.user.role === Role.SUPER_ADMIN
  ) {
    console.log("✅ Test 2 PASSED: Session JWT created and verified successfully.");
  } else {
    console.error("❌ Test 2 FAILED: Session JWT verification mismatch.");
    process.exit(1);
  }

  // 3. Test 2FA TOTP Generation & Verification
  console.log("\n[Test 3] Testing TOTP 2FA flow...");
  const testSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"; // 32-char Base32 test secret
  const currentToken = generateCurrentTOTPToken(testSecret);
  const isTokenValid = verifyTOTP(currentToken, testSecret);
  const isInvalidTokenValid = verifyTOTP("000000", testSecret);

  // Test Temp 2FA Token
  const tempToken = await sign2FATempToken({
    userId: mockUser.id,
    email: mockUser.email,
    organizationId: mockUser.organization_id,
  });
  const decodedTemp = await verify2FATempToken(tempToken);

  if (isTokenValid && !isInvalidTokenValid && decodedTemp?.userId === mockUser.id) {
    console.log("✅ Test 3 PASSED: TOTP token generation, verification, and temp 2FA token passed.");
  } else {
    console.error("❌ Test 3 FAILED: 2FA validation mismatch.");
    process.exit(1);
  }

  // 4. Test WebAuthn Passkey Options Generation
  console.log("\n[Test 4] Testing WebAuthn passkey registration & auth options...");
  const regOptions = await createWebAuthnRegistrationOptions({
    id: mockUser.id,
    email: mockUser.email,
    first_name: mockUser.first_name,
    last_name: mockUser.last_name,
  });

  const authOptions = await createWebAuthnAuthenticationOptions();

  if (regOptions.challenge && authOptions.challenge && regOptions.rp.name.includes("SunNFun")) {
    console.log("✅ Test 4 PASSED: WebAuthn challenge generation & RP configuration verified.");
  } else {
    console.error("❌ Test 4 FAILED: WebAuthn options generation failed.");
    process.exit(1);
  }

  // 5. Test RBAC Permissions & Overrides
  console.log("\n[Test 5] Testing RBAC role capability matrix & custom overrides...");
  const adminPermissions = resolveUserPermissions(Role.SUPER_ADMIN);
  const salesPermissions = resolveUserPermissions(Role.SALES_PERSON);
  const opsPermissions = resolveUserPermissions(Role.OPERATIONS);

  // Sales Person with a custom override granting "export_reports"
  const overriddenSales = resolveUserPermissions(Role.SALES_PERSON, [
    {
      id: "override-1",
      user_id: mockUser.id,
      permission_key: "export_reports",
      granted: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  if (
    adminPermissions.manage_users === true &&
    salesPermissions.manage_users === false &&
    salesPermissions.export_reports === false &&
    overriddenSales.export_reports === true &&
    opsPermissions.view_pricing === false
  ) {
    console.log("✅ Test 5 PASSED: RBAC capability matrix and UserPermissionOverride resolution passed.");
  } else {
    console.error("❌ Test 5 FAILED: RBAC permissions mismatch.");
    process.exit(1);
  }

  // 6. Test Automatic Field-Level Pricing Sanitization
  console.log("\n[Test 6] Testing automatic pricing field sanitization (stripPricingFields)...");
  const rawQuoteObject = {
    id: "quote-1001",
    trip_id: "trip-2001",
    hotel_name: "Yak & Yeti Hotel",
    package_amount: 1500.0,
    selling_price: 1900.0,
    markup: 400.0,
    margin: "21%",
    pax_adults: 2,
  };

  const adminView = stripPricingFields(rawQuoteObject, Role.ADMIN);
  const opsView = stripPricingFields(rawQuoteObject, Role.OPERATIONS) as Record<string, any>;

  if (
    adminView.selling_price === 1900.0 &&
    opsView.package_amount === undefined &&
    opsView.selling_price === undefined &&
    opsView.markup === undefined &&
    opsView.hotel_name === "Yak & Yeti Hotel" &&
    opsView.pax_adults === 2
  ) {
    console.log("✅ Test 6 PASSED: Sensitive pricing fields are successfully stripped for OPERATIONS role.");
  } else {
    console.error("❌ Test 6 FAILED: Pricing field sanitization failed.", { adminView, opsView });
    process.exit(1);
  }

  console.log("\n==================================================");
  console.log("🎉 ALL AUTH, 2FA, WEBAUTHN & RBAC TESTS PASSED!");
  console.log("==================================================");
}

runAuthAndRbacTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
