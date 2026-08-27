# 05. Phase 0, Task B.2 — Auth Flows: Credentials, Passkeys, 2FA & RBAC Guards

> **What was built in this phase:**
> Full authentication system — email/password login, WebAuthn passkeys (biometric & security key), TOTP-based 2-factor authentication, secure HttpOnly session cookies (JWT), and a centralized RBAC middleware layer that enforces multi-tenant data isolation and role-based access controls across all future API routes.

---

## 🧠 The Big Picture: Why Is Auth This Complex?

Authentication for a multi-tenant B2B SaaS is much more nuanced than a simple "username + password" login. Here's what we need to solve:

| Problem | Our Solution |
|---|---|
| Passwords can be stolen or phished | WebAuthn Passkeys (biometric / hardware key — phishing-resistant) |
| Credential theft via cookie hijacking | HttpOnly + Secure + SameSite=Lax JWT cookies (JavaScript can't read them) |
| Compromised passwords | TOTP 2FA — second proof of identity from an authenticator app |
| Staff seeing other tenants' data | `organization_id` injected into every session and every Prisma query |
| SALES_PERSON seeing all trips | RBAC middleware scopes data to `assigned_user_id === session.user.id` |
| Pricing info leaking to Operations | Automatic field stripping in `filterResourceFields()` |

---

## 📁 Files Created in This Phase

```
lib/
  auth.ts               ← Core security functions (passwords, JWT, TOTP, WebAuthn)
  rbac.ts               ← Role permission map + withAuthAndRbac() middleware wrapper

app/api/auth/
  login/route.ts        ← POST /api/auth/login
  logout/route.ts       ← POST /api/auth/logout
  me/route.ts           ← GET /api/auth/me
  2fa/verify/route.ts   ← POST /api/auth/2fa/verify
  webauthn/
    register/route.ts   ← GET (get options) + POST (verify & save) /api/auth/webauthn/register
    login/route.ts      ← POST (step 1 + step 2) /api/auth/webauthn/login

app/login/page.tsx      ← Login UI (centered card, email+password, passkey button, 2FA modal)

prisma/seed.ts          ← Creates test org + one user per role for demo/testing
scripts/test-auth-and-rbac.ts  ← Standalone verification script for auth & RBAC logic
```

---

## 🔐 How Password Login Works (Step by Step)

```
Browser → POST /api/auth/login  { email, password }
             ↓
         Zod validates input (email format, password min length)
             ↓
         prisma.user.findUnique({ where: { email } })  ← Global lookup, unscoped
             ↓
         bcrypt.compare(password, user.password_hash)  ← Constant-time comparison
             ↓
         Check: user.status === 'ACTIVE'?
             ↓
         Check: requires2FA? (user.two_factor_enabled || org.force_2fa)
             ↓
    [If 2FA needed]   [If no 2FA needed]
         ↓                    ↓
  Return tempToken    setSessionCookie(user)
  (10 min JWT)           (7-day HttpOnly JWT cookie)
         ↓                    ↓
  Client opens     Browser redirects to dashboard
  2FA modal
```

### 🧂 Why bcrypt? Why Not SHA256?
**bcrypt** is specifically designed for password hashing. It's:
- **Slow by design** — makes brute-force attacks impractical (12 rounds = ~200ms per check)
- **Salted** — prevents rainbow table attacks even if the DB is breached
- SHA256 is fast, which is the opposite of what you want for passwords

---

## 🗝️ WebAuthn Passkeys — Phishing-Proof Login

WebAuthn is the W3C standard behind Apple Face ID, Touch ID, Windows Hello, and YubiKey login. It uses **public key cryptography** where:
- The **private key never leaves your device**
- The server stores only the **public key**  
- A phishing site can never get the private key (the browser validates the domain)

### How Passkey Registration Works

```
1. Client: GET /api/auth/webauthn/register
   Server: Generates challenge + options, stores challenge in memory (10-min TTL)
   
2. Browser: navigator.credentials.create(options)
   → Prompts biometric (Face ID / Touch ID) or security key
   → Creates key pair on device
   → Returns registrationResponse
   
3. Client: POST /api/auth/webauthn/register  { registrationResponse }
   Server: @simplewebauthn/server verifyRegistrationResponse()
   → Validates challenge signature
   → Extracts credential.id + credential.publicKey
   → Saves new Passkey row in DB (linked to user)
```

### How Passkey Login Works

```
1. Client: POST /api/auth/webauthn/login  { action: "options", email }
   Server: Generates authentication options + challenge
   
2. Browser: navigator.credentials.get(options)
   → Device signs the challenge with the stored private key
   
3. Client: POST /api/auth/webauthn/login  { action: "verify", email, credential }
   Server: verifyAuthenticationResponse()
   → Matches signature against stored public key
   → Updates counter (replay attack protection)
   → Sets full session cookie
```

> **⚡ Shortcut**: The in-memory `challengeStore` (Map in `lib/auth.ts`) works for single-server dev.
> In production on Vercel (multi-instance), move challenge storage to Redis/Upstash.

---

## ⏱️ TOTP 2FA — Google Authenticator / Authy

TOTP stands for **Time-based One-Time Password** (RFC 6238). It works like this:

1. **Setup**: Server generates a random secret, shows it as a QR code
2. User scans with Google Authenticator / Authy — app stores the secret
3. **Every 30 seconds**, both app and server compute `HMAC(secret + time_window) → 6-digit code`
4. They match because they share the same secret and use the same 30-second time window

### Our Flow:

```
POST /api/auth/login → { requires2FA: true, tempToken }
        ↓
Client shows 2FA modal, user types 6-digit code
        ↓
POST /api/auth/2fa/verify { tempToken, totpCode }
        ↓
verify2FATempToken(tempToken) → { userId, email, organizationId }
        ↓
otplib.verifySync({ token: totpCode, secret: user.two_factor_secret })
        ↓
setSessionCookie(sessionUser) → Full session established
```

The `tempToken` is a short-lived 10-minute JWT — it proves the user passed password auth but hasn't yet completed 2FA. Without it, an attacker who intercepts the 2FA verify call couldn't reuse it for a different user.

---

## 🛡️ RBAC — Role-Based Access Control

The RBAC system lives in **`lib/rbac.ts`** and is built around a higher-order function called `withAuthAndRbac`.

### How `withAuthAndRbac()` Works

```typescript
// Every protected API route wraps its handler like this:
export const GET = withAuthAndRbac(
  async (req, { session, prisma }) => {
    // session.user is always populated and verified
    // prisma is already tenant-scoped to session.user.organization_id
    return NextResponse.json({ data: ... });
  },
  { requiredRole: "ADMIN" }  // Optional role constraint
);
```

**What happens inside `withAuthAndRbac`:**
1. Reads the session cookie → validates JWT → extracts `SessionUser`
2. Returns 401 if no valid session
3. Injects `getTenantPrisma(session.user.organization_id)` — all queries auto-scoped
4. Checks role requirements (if specified)
5. Calls your actual handler with the safe context

### Role Permission Matrix

| Role | Scope | Pricing Fields | Ledger | Quote Edit |
|---|---|---|---|---|
| `SUPER_ADMIN` | All orgs | ✅ | ✅ | ✅ |
| `ADMIN` | Own org | ✅ | ✅ | ✅ |
| `SALES_HEAD` | Own org | ✅ | ❌ | ✅ |
| `SALES_PERSON` | Own assigned trips | ✅ | ❌ | Own only |
| `OPERATIONS` | Own org | ❌ stripped | ❌ | ❌ |
| `RESERVATIONS` | Own org | ❌ stripped | ❌ | ❌ |
| `DATA_OPERATOR` | Own org | ❌ | ❌ | ❌ |
| `ACCOUNTANT` | Own org | ✅ | ✅ | ❌ |

> **How pricing stripping works:** `filterResourceFields(data, role)` removes fields like `selling_price`, `markup_amount`, and `profit_margin` from API responses for OPERATIONS and RESERVATIONS roles. This prevents accidental disclosure even if a developer forgets to manually restrict a field.

### `UserPermissionOverride` — Granular Adjustments

The schema has a `UserPermissionOverride` table for cases like:
- A specific `SALES_PERSON` being granted `export_reports` access
- A `SALES_HEAD` having `view_pricing` revoked for a sensitive account

`resolveUserPermissions(user, overrides)` in `lib/rbac.ts` starts from role defaults and applies these overrides at runtime.

---

## 🎨 Login UI — `app/login/page.tsx`

The login screen follows PRD Part 1's UI spec:
- **Minimalist centered card** on white background
- SunNFun logo placeholder (avatar initial)
- Email + Password inputs with Remember Me toggle
- "Forgot Password" placeholder link
- **"Sign in with Passkey"** button (calls WebAuthn flow client-side)
- Dynamic **2FA TOTP modal** when server returns `requires2FA: true`
- **Quick demo role switcher** for testing all 8 roles fast

---

## 🌱 Database Seeding — `prisma/seed.ts`

To test the auth system without manually creating users:

```bash
# First make sure database is running and migrated
npx prisma migrate dev

# Run the seed
npx tsx prisma/seed.ts
```

This creates:
- Organization: **Sun & Fun Holidays DMC**
- Brand, BillingAddress, BankAccount
- **8 users** — one per role — all with password `Admin@1234`

---

## ✅ Verification Commands

```bash
# 1. TypeScript — must have zero errors
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Run the auth & RBAC test script
npx tsx scripts/test-auth-and-rbac.ts

# 4. Start dev server and open login page
npm run dev
# → Open http://localhost:3000/login

# 5. Full production build validation
npm run build
```

---

## 🚀 What Comes Next

Phase 1 (Part 2 of the PRD) covers:
- **CRM Core**: `Trip`, `TripStage`, `TripSource`, `TripGuest` models
- **Master Inventory**: `Hotel`, `RateSheet`, `TransportService`, `TravelActivity`
- **Quote Engine**: Quote creation, line items, FOC handling, bulk PDF generation via Puppeteer
- **Itinerary Builder**: Day-by-day structured itinerary with hotel/transport/activity slots

→ Continue to: *[06. Phase 1 — CRM Core, Master Data & Quoting Engine (upcoming)]*
