# Travel CRM — Master Product Requirements Document (v2.0)

**Prepared for:** Raaj — Nepal Inbound DMC / Travel CRM SaaS venture
**Reference product:** Sembark Travel Software (sembark.com) — verified against live product documentation, feature index, and release notes (v1.144–v1.180) as of Aug 2026
**Build target:** Google Antigravity (agentic IDE) — see companion file `TravelCRM_Antigravity_Buildplan.md`
**Design intent:** Sembark-equivalent core, minimalistic complexity, phased for solo/small-team execution, architected for AI/agentic scaling into the AI Raaj stack

---

## Document Control

| Item | Detail |
|---|---|
| Version | 2.0 (supersedes the 6-part v1 draft) |
| Structure | 10 parts (Part 0 – Part 9), each in PRODUCT/PROBLEM/USER/USE-CASES/SCOPE/FEATURES/CONSTRAINTS/METRICS order |
| Source of truth for feature parity | Sembark's public `llms.txt` documentation index, feature pages, and release notes (live-fetched — not modeled from memory) |
| Out of scope entirely | Sembark's separate **Hotel CRM** product (PMS/channel-manager automation for hotels that own rooms) — different buyer, different data model. Revisit only if Raaj enters hospitality-owner software as its own venture. |

---

# PRD Part 0: Product Vision, Module Map & Phasing Strategy

**Product/Version:** Travel CRM SaaS — v0.1 (Foundation) → v1.0 (Sembark-parity MVP)
**Problem Statement:** Nepal Inbound DMC and comparable travel businesses currently run sales, itinerary, operations, and accounting on a mix of Excel, WhatsApp, and manual PDF work — the exact pre-CRM state Sembark's own marketing targets ("every detail hidden in some Excel sheet," "quotes delivered 2–3 hours late"). Building a CRM that matches Sembark's depth removes that ceiling for Raaj's own DMC first, then becomes a sellable SaaS module in the AI Raaj stack.
**Target User(s):** Sales agents, sales heads, operations/reservations staff, accountants, and org admins at small-to-mid DMCs, inbound/outbound tour operators, and B2B travel agencies (Sembark's exact ICP).
**Core Use Cases:**
- Capture a lead from any channel and quote it inside minutes, not hours.
- Turn a quote into a booking with correct supplier costing, without losing margin visibility.
- Run day-to-day tour operations (cabs, hotels, activities) from one calendar instead of a phone tree.
- Track every rupee owed and owing, in the right currency, without a spreadsheet reconciliation at month-end.
- Eventually let AI Raaj draft quotes, parse lead emails, and chase payments with a human only approving exceptions.
**Out of Scope (this part):** Any feature spec — this part is the map, not the territory.

## Feature Specifications

### A. Verified Sembark Information Architecture (live-sourced)
Sembark organizes its product as: **Enquiries & Leads → Itinerary Builder → Quotations → Bookings → Hotel Reservations → Tour Operations → Suppliers & Contracting → Payments & Accounting → Reminders & Notifications → Reports & Analytics**, sold as a core platform plus four paid add-ons: **Payments by Sembark** (in-flow collection), **Multi-Brand Expand** (run B2B/B2C/destination-brands under one login), **Notify** (trigger-based WhatsApp automation), and **Dial2Deal** (CRM-integrated calling/IVR).

### B. Module Map — this PRD's Parts vs. Sembark's IA

| PRD Part | Sembark Equivalent Area(s) | Priority |
|---|---|---|
| Part 1 — Architecture, Auth, Org Core | Login, Users & Teams, Account Security, Multi-Branding | P0 — Foundation |
| Part 2 — CRM Core (Leads/Queries/Guests) | Queries, Trip Plan Requests, Guests & Tourists, Tasks | P0 — MVP |
| Part 3 — Master Data & Supplier Management | Hotels, Transport, Activities, Suppliers, Rates & Seasons, Trip Sources, Itineraries | P0 — MVP (feeds Part 4) |
| Part 4 — Quotation Engine & Itinerary Builder | Quotes, Pricing & Mark-up, Flights, Quote PDF/Email Templates | P0 — MVP |
| Part 5 — Operations, Dispatch & Calendars | Tour Operations, Hotel Bookings, Vouchers, Check-in/out | P1 — Post-MVP |
| Part 6 — Accounting, Ledgers & Payment Gateway | Payments & Collection Tracking, Proforma Invoice, Suppliers Ledger | P1 — Post-MVP |
| Part 7 — Integrations, Notify & AI Automation | Integrations, Notify add-on, AI Email Parsing (Sembark v1.176) | P2 — Differentiation |
| Part 8 — Security, Multi-Tenancy & Deployment | Administration & Security, cross-cutting | P0 — Foundation |
| Part 9 — AI & Agentic Layer Roadmap | Not in Sembark; Raaj's AI Raaj differentiation layer | P2 — Moat |

### C. Phasing (recommended build order for a solo/AI-agent-driven build)

1. **Phase 0 – Foundation (Parts 1 + 8):** auth, org, RBAC, multi-tenancy scaffolding. Nothing else works without this.
2. **Phase 1 – Sellable MVP (Parts 2 + 3 + 4):** a lead can become a priced, shareable quote. This alone replicates Sembark's highest-cited value prop ("quote in under 60 seconds").
3. **Phase 2 – Operate & Collect (Parts 5 + 6):** a quote becomes a run trip with tracked cash. This is what makes the CRM replace Excel entirely, not just the sales step.
4. **Phase 3 – Automate & Differentiate (Parts 7 + 9):** WhatsApp/email automation and AI drafting — this is where Travel CRM stops being "a Sembark clone" and becomes an AI Raaj module.

### D. Deliberate Simplifications vs. Sembark (v1.0 scope)
To hit "minimalistic complexity" honestly, v1.0 explicitly **defers**:
- Dial2Deal-style IVR/calling — high integration cost, low usage until team scales past ~5 agents.
- Multi-Brand Expand's full brand-isolation model — v1.0 ships single-brand multi-currency; brand-switching is a Part 8 stretch item once a second DMC/OTA brand needs it.
- Hotel CRM (channel manager/PMS sync) — different product, different buyer.
- Flight GDS live-search — v1.0 ships manual + simple content-API flight entry; live Sabre GDS search is a Part 4 stretch item once outbound-flight volume justifies the integration cost.

## Technical Constraints
- Confirmed stack for the whole build (do not substitute): **Next.js/React + Tailwind + Shadcn UI, PostgreSQL via Prisma, Vercel, Supabase, WhatsApp Business API (Meta Cloud API), Sabre GDS (Part 4 stretch), Claude API / OpenAI API / Gemini API, n8n, Airtable.**
- **n8n** is the orchestration layer for everything in Part 7 (Notify rules, AI email parsing, lead-webhook routing) — it sits *outside* the Next.js app and calls its APIs, rather than being reimplemented in-app.
- **Airtable** is not the system of record (Postgres is) — it is the AI Raaj cross-venture visibility mirror: a scheduled n8n job syncs read-only rollups (daily revenue, pipeline counts) out to Airtable for exec-level dashboards shared across Raaj's other ventures.
- **Payments:** default gateway is **Paddle** for Nepal-based organizations (per confirmed operational constraint); Part 6 specifies a pluggable gateway interface so non-Nepal tenants can add a regional gateway later without a Paddle migration.

## Success Metrics
- Phase 0 done when a Super Admin can log in, invite a user, and that user is correctly RBAC-scoped.
- Phase 1 done when a lead captured through any source can be quoted, priced in 3+ currencies, and shared via WhatsApp/Email/PDF in under 5 minutes end-to-end (Sembark's own "quote in 60 seconds" is the itinerary-build step alone; 5 minutes is the realistic full-flow target for v1.0).
- Phase 2 done when a converted trip's supplier costs and client collections both reconcile to zero variance against the accepted quote.
- Phase 3 done when at least one automation (AI email parsing or Notify) runs unattended for 30 days with a human-exception rate under 10%.

---

# PRD Part 1: Architecture, Authentication & Organization Core
**Reference:** Sembark Login, Passwordless Login (Passkeys), 2FA, Account Security, Dashboard & Notifications, Users & Teams, Multi-Branding, Addresses, Bank Accounts docs.

**Product/Version:** Travel CRM — Part 1 — v1.0
**Problem Statement:** Every other module depends on a correctly modeled Organization, User, and permission layer. Sembark treats this as security-critical (passkeys, 2FA, revocable per-user permissions, session/device management) — not an afterthought — because a travel CRM holds client payment data and supplier contracts.
**Target User(s):** Super Admin (org owner), Admin, and every other role who logs in downstream.
**Core Use Cases:**
- Org owner sets up company profile, billing addresses, bank accounts, and brand assets once.
- Admin invites teammates, assigns roles, and can revoke access instantly if someone leaves.
- Any user logs in fast and securely (password, passkey, or 2FA) and lands on a dashboard scoped to what their role should see.
- Admin can split domestic vs. international teams so one team never sees the other's trips (a real Sembark FAQ pattern).
**Out of Scope (this part):** Trip/lead data model (Part 2), quote data model (Part 4).

## Feature Specifications

### A. Core Database Schema (Prisma/PostgreSQL)

**`Organization`**
- `id` (UUID, PK), `company_name`, `brand_short_name`, `support_contact_number`
- `brand_color_theme` (hex), `trip_prefix` (e.g. `"SBC-"`, used for `Trip.trip_display_id`)
- `logo_url`, `header_banner_url`, `footer_banner_url` (S3/Supabase Storage URLs)
- `default_timezone` (String, IANA tz — Sembark explicitly supports multi-timezone offices)
- `created_at`, `updated_at`

**`Brand`** *(new vs. v1 draft — supports Multi-Branding without full Multi-Brand-Expand complexity)*
- `id`, `organization_id` (FK), `name` (e.g. "Nepal Inbound DMC", "Nepal Inbound OTA")
- `logo_url`, `color_theme`, `trip_prefix_override` (nullable), `is_default` (Boolean)
- *v1.0 note:* every `Organization` gets exactly one auto-created default `Brand`; multi-brand UI ships as a Part 8 stretch flag.

**`BillingAddress`**
- `id`, `organization_id` (FK), `label`, `address_text`, `contact_number`
- `billing_details` (Text — trade license, VAT/PAN/GST number), `is_primary` (Boolean)
- `destination_id` (FK, nullable — Sembark supports destination-specific addresses)

**`BankAccount`**
- `id`, `organization_id` (FK), `bank_name`, `account_number`, `swift_code`, `currency`

**`User`**
- `id`, `organization_id` (FK), `team_id` (FK, nullable — see `Team` below)
- `first_name`, `last_name`, `email` (unique), `password_hash` (nullable if passkey-only)
- `phone_number`, `role` (Enum: `SUPER_ADMIN`, `ADMIN`, `SALES_HEAD`, `SALES_PERSON`, `OPERATIONS`, `RESERVATIONS`, `DATA_OPERATOR`, `ACCOUNTANT`)
- `status` (Enum: `ACTIVE`, `DISABLED`), `last_login`, `two_factor_enabled` (Boolean)
- `theme_preference` (Enum: `LIGHT`, `DARK` — Sembark ships dark mode; trivial to include from day one)

**`Team`** *(new — matches the real Sembark "separate domestic and international teams" pattern)*
- `id`, `organization_id` (FK), `name` (e.g. "Domestic", "International")
- `destination_scope` (Array of destination IDs, nullable — restricts which trips a team can see)

**`UserPermissionOverride`** *(new — matches Sembark's "revocable permissions per user," v1.176)*
- `id`, `user_id` (FK), `permission_key` (String, e.g. `"view_pricing"`, `"export_reports"`)
- `granted` (Boolean) — lets an Admin grant/revoke one specific permission without changing the user's whole role.

**`Passkey`** *(new — WebAuthn credential storage for passwordless login)*
- `id`, `user_id` (FK), `credential_id`, `public_key`, `device_label`, `created_at`, `last_used_at`

### B. API Endpoints to Scaffold

- **Auth Module:**
  - `POST /api/auth/login` (email+password → JWT)
  - `POST /api/auth/webauthn/register` / `POST /api/auth/webauthn/login` (passkey flows)
  - `POST /api/auth/2fa/verify` (TOTP code against an authenticator app)
  - `POST /api/auth/logout`, `GET /api/auth/me` (user + role + resolved permission set)
- **Organization Module (Super Admin only):**
  - `GET /api/org/settings` / `PUT /api/org/settings`
  - `POST /api/org/billing-address`, `POST /api/org/bank-account`
  - `GET/POST /api/org/brands` (Multi-Branding — stretch)
- **User & Team Management (Admin/Sales Head):**
  - `GET /api/users` (filter by status/role/team)
  - `POST /api/users/invite`, `PUT /api/users/:id/status`
  - `PUT /api/users/:id/permissions` (grant/revoke `UserPermissionOverride` rows)
  - `GET/POST /api/teams`, `PUT /api/teams/:id/members`
- **Dashboard shell:**
  - `GET /api/notifications` (Sembark ships an in-app notification center — see Part 2 for the events that populate it)

## Technical Constraints
- **RBAC route guards:** `SALES_PERSON` → `assignedTo === user.id` only. `ADMIN`/`SALES_HEAD` → org-wide. `OPERATIONS`/`RESERVATIONS` → confirmed bookings + supplier ledgers, never selling-price/markup fields. `ACCOUNTANT` → all ledgers, no quote-editing. Team scoping (via `Team.destination_scope`) is a second filter applied *after* role scoping, not instead of it.
- **Auth security:** NextAuth.js (Auth.js) for credential/session management; HttpOnly+Secure session cookies; WebAuthn library (e.g. `@simplewebauthn/server`) for passkeys, mirroring Sembark's passwordless-login push.
- **2FA:** TOTP via `otplib`, admin can force-enable 2FA org-wide (Sembark FAQ confirms admin-controlled 2FA).
- **Multi-currency utility:** a single `formatCurrency(amount, currencyCode, orgLocaleSettings)` used everywhere prices render — Sembark's own v1.167 release ("Hyper-localisation of Currency") shows this needs region-aware rounding and separator rules, not just a currency symbol swap.
- **Multi-tenant isolation:** every query filters `where: { organization_id: user.orgId }` — detailed further in Part 8.

**AI Raaj Delegation Split:** ~85% of this part (schema scaffolding, CRUD endpoints, auth wiring, RBAC middleware) is fully agent-buildable in Antigravity from this spec with minimal review. The ~15% requiring Raaj's judgment: the exact permission-key taxonomy for `UserPermissionOverride` (only Raaj knows which edge-case access splits his real team needs) and the initial role-to-navigation mapping.

## Success Metrics
- A Super Admin can complete org setup (branding, one billing address, one bank account) in under 10 minutes.
- A `SALES_PERSON` login, when queried, returns zero rows belonging to another user's trips (verified by a Playwright/Antigravity browser test, not just a manual check).
- Passkey login succeeds on at least one mobile and one desktop browser before Phase 0 is marked done.

---

# PRD Part 2: CRM Core — Leads, Queries, Follow-Ups & Guest Management
**Reference:** Sembark Queries overview, Add/Query Details, Follow-ups & Tags, Trip Plan Requests, Tasks & Comments, Guests & Tourists, Holding/Locking & Archival, Dashboard & Notifications docs.

**Product/Version:** Travel CRM — Part 2 — v1.0
**Problem Statement:** Sembark's own positioning is blunt about the failure mode this replaces: leads arrive from five channels, live in someone's head or a notebook, and go cold because no one has a follow-up system. The dashboard and lead pipeline are the first thing a sales team touches every day — this part has to feel instant, not just be correct.
**Target User(s):** Sales agents (daily use), Sales Head (pipeline oversight), Admin (lead distribution rules).
**Core Use Cases:**
- See today's sales stats, pending follow-ups, and who's traveling right now, on login.
- Add a lead in under 30 seconds, whether typed manually or auto-captured from a form/ad.
- Never lose track of a promised follow-up — a due-today reminder is unmissable.
- Distinguish a raw, unqualified inbound lead (Trip Plan Request) from a real, sales-owned Trip.
- Track a guest's travel documents and repeat-traveler history without re-typing it every trip.
**Out of Scope (this part):** Pricing/quoting logic (Part 4), operational fulfillment (Part 5).

## Feature Specifications

### A. Core Database Schema (Prisma/SQL)

**`Guest`**
- `id`, `organization_id` (FK), `full_name`, `phone_number` (indexed), `email` (nullable)
- `salutation` (String, e.g. "Mr.", "Mrs." — Sembark v1.171 added guest salutations system-wide)
- `is_repeat_traveler` (Boolean, derived/cached), `created_at`, `updated_at`

**`GuestDocument`** *(new — Sembark v1.180 "Guest Document Management")*
- `id`, `guest_id` (FK), `document_type` (Enum: `PASSPORT`, `VISA`, `NATIONAL_ID`, `OTHER`)
- `file_url` (S3), `expiry_date` (nullable), `uploaded_via` (Enum: `AGENT`, `SELF_SERVICE_LINK`)
- `upload_link_token` (String, nullable — powers a secure, expiring self-upload link sent to the guest so agents aren't manually collecting passport scans over WhatsApp)

**`TripPlanRequest`** *(new — the pre-Trip staging area for auto-captured, unqualified leads)*
- `id`, `organization_id` (FK), `source` (Enum: `WEBSITE_FORM`, `META_ADS`, `GOOGLE_ADS`, `CHATBOT`, `MANUAL`)
- `raw_payload` (JSON — whatever the webhook sent), `guest_name`, `phone_number`, `email`, `destination_text`
- `status` (Enum: `UNASSIGNED`, `ASSIGNED`, `CONVERTED_TO_TRIP`, `REJECTED`), `assigned_user_id` (FK, nullable)
- `converted_trip_id` (FK, nullable) — once a human (or the AI parser in Part 7) qualifies it, it becomes a `Trip`.

**`Trip`** *(the qualified lead / booking — Sembark calls this a "Query")*
- `id`, `trip_display_id` (String, e.g. `"SBC-81881"`, generated from `Organization.trip_prefix` + sequence)
- `organization_id` (FK), `brand_id` (FK), `team_id` (FK, nullable), `assigned_user_id` (FK → User)
- `guest_id` (FK), `destination_id` (FK → `TripDestination`, see Part 3), `secondary_destination_id` (FK, nullable — Sembark supports combined two-destination packages)
- `start_date`, `duration_days`, `duration_nights`, `pax_adults`, `pax_children`
- `origin_city` (String, nullable — Sembark v1.142 added this for sales-origin analysis)
- `trip_source_id` (FK → `TripSource`, see Part 3 — replaces the old free-text `source` field)
- `status` (Enum: `NEW_QUERY`, `IN_PROGRESS`, `ON_HOLD`, `CONVERTED`, `COMPLETED`, `CANCELLED`, `DROPPED`)
- `is_locked` (Boolean — Sembark auto-locks past trips; Admin can unlock), `is_archived` (Boolean — auto-archives >1 year old)
- `tags` (Array of Strings), `package_amount` (Decimal, nullable), `currency` (nullable)
- `has_stale_activity_warning` (Boolean, derived — Sembark flags `IN_PROGRESS` leads untouched for 3+ days)
- `created_at`, `updated_at`

**`Tourist`** *(new — multi-guest-per-trip, Sembark v1.169/v1.180)*
- `id`, `trip_id` (FK), `full_name`, `age` (nullable), `relation_to_primary_guest` (nullable)
- `assigned_service_ids` (Array — which hotel/transport rows this specific tourist is on, for split-room trips)

**`FollowUp`**
- `id`, `trip_id` (FK), `assigned_to_user_id` (FK), `due_date`, `remarks` (Text)
- `status` (Enum: `PENDING`, `COMPLETED`, `OVERDUE`), `is_actionable_comment` (Boolean — distinguishes a plain note from a scheduled follow-up)

**`TripTask`** *(new — general task/comment thread, separate from follow-up due-dates)*
- `id`, `trip_id` (FK), `created_by_user_id` (FK), `assigned_to_user_id` (FK, nullable)
- `content` (Text), `is_completed` (Boolean), `notify_on_assignment` (Boolean — Sembark sends task-assignment emails)

### B. API Endpoints to Scaffold

- **Dashboard Aggregations:**
  - `GET /api/dashboard/stats?dateRange=today|week|month` → revenue grouped by currency (CONVERTED only), lead counts by status, follow-up counts by Today/Yesterday/Next-7-Days.
  - `GET /api/dashboard/live-trips` → trips where `start_date <= today <= start_date + duration_days`.
  - `GET /api/dashboard/notifications` → unread notification feed (task assignments, stale-lead warnings, payment-due alerts from Part 6).
- **Trip Plan Requests (pre-qualification inbox):**
  - `GET /api/trip-plan-requests` (filterable by source/status)
  - `POST /api/trip-plan-requests/:id/assign`, `POST /api/trip-plan-requests/bulk-assign` (Sembark v1.174 added bulk assign here specifically)
  - `POST /api/trip-plan-requests/:id/convert` → creates `Guest` + `Trip` in `NEW_QUERY`, links back via `converted_trip_id`.
- **Trip/Lead Management:**
  - `GET /api/trips` (filters: `search`, `status`, `assigned_user_id`, `destination`, `team_id`, `show_archived`)
  - `POST /api/trips`, `GET /api/trips/:id`, `PATCH /api/trips/:id/status`
  - `POST /api/trips/:id/hold`, `POST /api/trips/:id/cancel`, `POST /api/trips/:id/drop` (Sembark treats Hold, Cancel, and Drop as three distinct, non-interchangeable terminal/semi-terminal actions — see Technical Constraints)
  - `POST /api/trips/:id/lock`, `POST /api/trips/:id/unlock` (Admin-only)
  - `POST /api/trips/bulk-assign` (Admin reassigning a departed teammate's book of trips — a real Sembark FAQ)
  - `GET /api/search/global?q=` (guest name / Trip ID search across the org — Sembark's Global Search matches exact guest name, a documented limitation worth keeping in mind, not silently "fixing" with fuzzy match that could surface the wrong client)
- **Guests, Tourists & Documents:**
  - `POST /api/trips/:id/tourists`, `PUT /api/tourists/:id`
  - `POST /api/guests/:id/documents/request-upload` → generates a secure, expiring self-upload link and sends it via WhatsApp/email
  - `POST /api/guests/:id/documents` (agent-side upload)
- **Follow-ups & Tasks:**
  - `POST /api/follow-ups`, `PATCH /api/follow-ups/:id/complete`
  - `POST /api/trips/:id/tasks`, `PATCH /api/tasks/:id/complete`

## Feature Specifications — UI/UX Requirements

### A. The Smart Dashboard (Home Screen)
- Grid cards, mobile-stacked / desktop-multi-column.
- **Card 1 — Trip Sales Stats:** Today/Week/Month toggle; revenue shown per-currency side by side (never summed across currencies); Leads/Quotes/Conversions counts.
- **Card 2 — Pending Follow-ups:** Today / Yesterday (red badge if >0) / Next 7 Days tabs.
- **Card 3 — Live Trips (On-Trip Radar):** guest name, destination, "Day X of Y."
- **Card 4 — Trip Plan Requests inbox** *(new)*: unassigned auto-captured leads, with a one-click "Assign to me" / round-robin distribute action.
- **Notification bell:** unread count, dropdown feed, mark-all-read.

### B. Trips List (Lead Pipeline)
- Horizontally scrollable status tabs: All, New Query, In Progress, On Hold, Converted.
- Compact card per lead: Destination & Trip ID, Guest Name, dates/config (`4 Sep 2026 • 4N,5D • 4A,2C`), Tags, click-to-dial icon (`<a href="tel:+...">`).
- Stale-activity warning icon on any `IN_PROGRESS` lead untouched 3+ days.
- "Show Archived Trips" toggle to surface trips over a year old for Global Search / manual lookup.

### C. Trip Plan Requests Screen *(new)*
- Table view distinct from the Trips pipeline — this is intentionally a *different* screen from "Trips," matching Sembark's own IA choice to keep unqualified auto-leads out of the sales pipeline until a human (or AI parser, Part 7) confirms they're real.
- Columns: Source (with channel icon), Raw Name/Phone, Destination text, Received At, Status.
- Bulk-select + "Bulk Assign" action.

### D. Guest & Tourist Panel (inside Trip Details)
- Primary Guest card with salutation, contact, and a "Request Documents" button (fires the secure upload-link flow).
- Tourist list (add/remove rows) for multi-pax trips, each optionally linked to specific hotel/transport service rows.

## Technical Constraints
- **Trip lifecycle is not a single linear status enum in practice** — Hold, Cancel (pre-conversion), and Drop (post-conversion, with cancellation charges) are semantically different per Sembark's own FAQs: a Dropped trip **cannot be reverted**; a Cancelled (pre-conversion) trip can. Model this as three distinct actions with different guard conditions, not three values of the same button.
- **React Query caching:** pipeline tab switches use `staleTime` of 5+ minutes so tab-switching feels instant.
- **Currency-grouped revenue aggregation:** Prisma `groupBy` on `Trip.currency` — never `SUM()` across currencies. Return `[{ currency: 'USD', _sum: { package_amount: 5000 } }, ...]`.
- **Duplicate-guest warning is stage-scoped:** only warn on a duplicate phone number while a trip is `NEW_QUERY`/`IN_PROGRESS` — Sembark deliberately stops warning post-conversion (a converted repeat client isn't a duplicate-entry error).
- **Archival is automatic, not manual:** a scheduled job (Part 7 background jobs) flips `is_archived = true` at the 1-year mark; Global Search only includes archived trips when `show_archived` is explicitly toggled on.
- **Click-to-dial:** `tel:` protocol links, no third-party dialer dependency.

**AI Raaj Delegation Split:** ~75% agent-buildable (schema, CRUD, dashboard aggregation queries, pipeline UI). The ~25% needing Raaj's judgment: the exact round-robin/skill-based lead-distribution rules for `TripPlanRequest` auto-assignment, and which fields the AI email parser (Part 7) is trusted to auto-populate vs. must leave for a human to confirm — this is the direct precursor to AI Raaj handling first-response triage.

## Success Metrics
- Dashboard loads all four cards in under 1.5s on a 4G mobile connection (field-agent use case).
- A lead added manually is queryable via Global Search within 1 second of save.
- Zero cross-currency summation bugs in the revenue card (tested with at least 3 concurrent currencies).

---

# PRD Part 3: Master Data & Supplier / Contracting Management
**Reference:** Sembark Trip Destinations, Hotels, Transport Services, Travel Activities, Suppliers, Rates & Seasons, Trip Sources, Itineraries (master data), Bulk Upload/Edit/Delete, Smart Price Handling, Flexible Transport Billing Metrics docs.

**Product/Version:** Travel CRM — Part 3 — v1.0
**Problem Statement:** Sembark's own comparative marketing centers on exactly this: "every detail of your business is hidden in some Excel sheet — payment dates, supplier pricing, vendor details." Master data is the least glamorous part of the build and the one that determines whether Part 4's quoting engine is fast or fragile. The original v1 draft under-specified this as a side effect of Parts 3–4; it deserves its own part.
**Target User(s):** Data Operator / Admin (bulk data entry), Sales agents (read-only search/autocomplete while quoting).
**Core Use Cases:**
- Load hundreds of hotel rates from an Excel sheet in one upload instead of hundreds of manual entries.
- Add one missing hotel mid-quote without leaving the quote screen ("Quick Add").
- Store season-wise, occupancy-wise rates so the right price surfaces automatically by travel date.
- Block sale of a hotel/room for specific dates (stop-sale, blackout) without deleting the rate.
- Keep a B2B agent's own billing details, tags, and ledger separate from a walk-in B2C guest.
**Out of Scope (this part):** How these records get priced *into* a specific quote (Part 4); how a booked service gets paid (Part 6).

## Feature Specifications

### A. Core Database Schema (Prisma/SQL)

**`TripDestination`**
- `id`, `organization_id` (FK), `name` (e.g. "Kathmandu", "Vietnam")
- `image_url`, `support_contact_number`, `child_max_age` (Int — Sembark makes this destination-specific, not global)
- `default_checkin_time`, `default_checkout_time`

**`Supplier`** *(unified — Sembark v1.168 merged hotel/transport/activity suppliers into one module)*
- `id`, `organization_id` (FK), `name`, `type` (Enum: `HOTEL`, `TRANSPORT`, `ACTIVITY`, `DMC`)
- `contact_name`, `contact_number`, `email`, `notes` (Text)

**`Hotel`**
- `id`, `organization_id` (FK), `supplier_id` (FK, nullable), `name`, `star_rating`, `destination_id` (FK)
- `address`, `website_url`, `general_notes` (Text, shareable via WhatsApp/email/voucher — Sembark v1.163)
- `entry_method` (Enum: `MANUAL`, `FILE_UPLOAD` — Sembark tracks how a hotel record was created)

**`HotelRoom`**
- `id`, `hotel_id` (FK), `room_type`, `meal_plan` (FK → `MealPlan`, org-customizable, not a fixed enum — Sembark lets orgs rename/redescribe meal plans)
- `max_occupancy`, `extra_bed_supported` (Boolean)

**`RateSheet`** *(new — replaces a single flat `base_price` field; this is the real Sembark model)*
- `id`, `hotel_room_id` (FK, nullable) / `transport_service_id` (FK, nullable) / `activity_id` (FK, nullable) — polymorphic-by-nullable-FK, one non-null
- `season_name` (String, e.g. "Peak — Oct-Nov"), `valid_from`, `valid_to`
- `occupancy_type` (Enum: `SINGLE`, `DOUBLE`, `TRIPLE`, `EXTRA_BED`), `weekday_price` (Decimal), `weekend_price` (Decimal, nullable)
- `sales_price` (Decimal, nullable) / `ops_price` (Decimal, nullable) — Sembark supports separate Sales-team vs. Ops-team rate columns in the same sheet.
- `currency`, `is_stop_sale` (Boolean), `blackout_dates` (Array of Date)

**`TransportService`**
- `id`, `organization_id` (FK), `destination_id` (FK), `cab_type` (String), `capacity` (Int)
- `billing_metric` (Enum: `PER_SERVICE`, `PER_KM`, `PER_DAY` — Sembark's "Flexible Transport Billing Metrics")
- `closing_days` (Array of weekday ints, nullable), `is_archived` (Boolean — cab types can't be hard-deleted, only archived)

**`TravelActivity`**
- `id`, `organization_id` (FK), `destination_id` (FK), `name`, `ticket_type` (String)
- `closing_days` (Array), `is_group_priced` (Boolean), `group_size` (Int, nullable — per-group pricing per a real Sembark FAQ pattern)

**`Itinerary`** *(reusable day-wise template — distinct from a `Quote_Day`, which is trip-specific)*
- `id`, `organization_id` (FK), `destination_id` (FK), `title`, `day_number`, `description` (Text), `image_url`

**`TripSource`** *(replaces the v1 draft's free-text `source` string on `Trip`)*
- `id`, `organization_id` (FK), `name` (e.g. "MakeMyTrip B2B", "Instagram Ads", "Direct Walk-in")
- `type` (Enum: `B2B_AGENT`, `DIGITAL_CHANNEL`, `DIRECT`, `REFERRAL`)
- `contact_person`, `billing_details` (Text), `tags` (Array), `is_primary_contact_flagged` (Boolean)
- *(A `TripSource` of type `B2B_AGENT` gets its own ledger — see Part 6.)*

### B. API Endpoints to Scaffold

- **Search & Quick Add (used live from the Quote Builder in Part 4):**
  - `GET /api/inventory/hotels?q=` (autocomplete), `POST /api/inventory/hotels/quick-add`
  - `GET /api/inventory/transport?q=`, `POST /api/inventory/transport/quick-add`
  - `GET /api/inventory/activities?q=`, `POST /api/inventory/activities/quick-add`
- **Bulk Operations:**
  - `POST /api/inventory/hotels/bulk-import` (multipart CSV/XLSX)
  - `POST /api/inventory/rates/bulk-import` (rate-sheet specific — separate from the hotel-record import)
  - `POST /api/inventory/{hotels|transport|activities}/bulk-disable` (Sembark ships bulk-disable with advanced filters, not just bulk-create)
  - `GET /api/inventory/hotels/download-template` (sample XLSX with required columns)
- **Merge & Archive (data hygiene — records are never hard-deleted):**
  - `POST /api/inventory/hotels/:id/merge` (`{ mergeIntoId }`) — Sembark explicitly disallows hotel deletion; duplicates are merged, keeping one primary.
  - `POST /api/inventory/{transport|activities}/:id/archive`
  - `POST /api/trip-sources/:id/merge`
- **Suppliers, Destinations, Itineraries, Trip Sources:** standard CRUD (`GET/POST/PUT`) scoped to `organization_id`.

## Feature Specifications — UI/UX Requirements

### A. Bulk Import Interface
- `Settings > Master Data > Import`, drag-and-drop (`react-dropzone`).
- "Download Sample Template" per data type — Sembark's real templates encode extra rules in plain cells (documented via FAQs, not obscure config): e.g. `Deluxe Room (40R)(2P)` to mean 40 rooms at 2-pax occupancy; a vendor name in double brackets (`Swift [[ABC TRAVEL]]`) to tag a hidden second transport vendor; `(Sales)`/`(Ops)` suffixes on a season column to split sales-vs-ops pricing. **Build the parser to these exact conventions** — they are Raaj's fastest path to feature parity without redesigning the sheet format his ops team may already be used to from evaluating Sembark.
- Client-side parse-and-validate (`papaparse`/`xlsx`/SheetJS) before upload, highlighting missing/malformed columns immediately.

### B. "Quick Add" Modal (inside the Quote Builder, spec'd here since it's master-data creation)
- Triggered when a hotel/transport/activity search returns no match.
- Opens as a modal/portal that does **not** unmount or reset the parent Quote form's state (state preservation is the whole point — see Technical Constraints).
- Minimal fields only (Name, Star Rating/Type, Destination, one Meal Plan/Rate row) — full rate-sheet detail is added later from Master Data, not forced at quote time.

### C. Master Data List Views
- Standard filterable/sortable data tables (Shadcn Table) per entity, with a visible "Manual Entry vs. File Upload" origin indicator on Hotels (Sembark tracks and surfaces this).
- Stop-sale/blackout dates surfaced as a visual badge on the relevant `RateSheet` row, not buried in an edit form.

## Technical Constraints
- **No hard deletes on referenced master data.** Hotels, transport types, and trip sources can be archived or merged, never deleted — because historical `Quote_Item`/`Service_Booking` rows hold foreign keys into them and must remain queryable for past-trip reporting.
- **Rate resolution logic:** given a `Trip.start_date` + `duration`, the pricing engine (Part 4) must resolve the correct `RateSheet` row by destination → season date-range → occupancy → (weekday/weekend if applicable) → (sales/ops split if applicable), and must **hard-fail with a clear "no valid rate" error** rather than silently falling back to a stale price — this is the exact failure mode Sembark's marketing calls out ("your team still sends off-season pricing for a peak-season query").
- **Quick Add state preservation:** implement via React Portal + independent Zustand store for the Quick Add form, so the parent `react-hook-form` quote state never re-renders/resets.
- **Bulk import parsing happens client-side first** (papaparse/SheetJS) to avoid server memory spikes and to give instant column-validation feedback before any network call.

**AI Raaj Delegation Split:** ~70% agent-buildable (schema, CRUD, bulk-import plumbing, list UIs). The ~30% needing Raaj's judgment: the exact bulk-template cell conventions to standardize on for his own ops team (matching Sembark's conventions exactly vs. simplifying them), and which destinations/suppliers to seed as launch data from Nepal Inbound DMC's existing operational knowledge base.

## Success Metrics
- A 200-row hotel rate sheet imports and is quote-ready in under 60 seconds, with any malformed rows rejected individually (not the whole batch).
- Quote Builder Quick Add never causes the parent quote form to lose already-entered days/services (zero data-loss reports in QA).
- Rate resolution returns a "no valid rate for these dates" error, never a wrong-season price, in 100% of out-of-range test cases.

---

# PRD Part 4: Quotation Engine & Itinerary Builder
**Reference:** Sembark Smart Itinerary Builder, Create/Update Quote, Pricing/Markup/Taxes, Multi-Option Quotes, Flights, Quote PDF/Email Templates, Quote Suggestions & Reuse docs.

**Product/Version:** Travel CRM — Part 4 — v1.0
**Problem Statement:** This is Sembark's single most-cited value prop across every review and landing page: a full, correctly-costed, beautifully-formatted itinerary in under 60 seconds. It's also the module where pricing mistakes directly cost margin — component-level markup and tax logic has to be exactly right, not approximately right.
**Target User(s):** Sales agents (primary daily tool), Sales Head (reviewing margins before a quote goes out).
**Core Use Cases:**
- Build a day-by-day itinerary by selecting hotels/transport/activities from a dropdown, with cost and selling price both auto-calculated.
- Offer a client three tiers of the same trip (Deluxe/Luxury/Premium) in one shareable quote.
- Apply markup and tax at the right level — sometimes per component, sometimes per person, sometimes as one flat number — without manual arithmetic.
- Share the finished quote as WhatsApp text, a formatted email, or a branded PDF, with toggles for what's visible.
- Reuse a past quote as the starting point for a similar new lead instead of rebuilding from scratch.
**Out of Scope (this part):** Turning an accepted quote into confirmed supplier bookings (Part 5); collecting payment against it (Part 6).

## Feature Specifications

### A. Core Database Schema (Prisma/SQL)
*A `Trip` can have multiple `Quote` versions; only one may be `ACCEPTED`.*

**`Quote`**
- `id`, `trip_id` (FK), `version` (Int, auto-increment per trip), `status` (Enum: `DRAFT`, `SHARED`, `ACCEPTED`, `REJECTED`, `EXPIRED`)
- `pricing_strategy` (Enum: `OVERALL`, `PER_PERSON`, `PER_COMPONENT`, `PER_COMPONENT_PER_PERSON` — Sembark's exact 4 strategies, v1.160)
- `total_cost_price`, `total_selling_price`, `currency`, `valid_until`
- `is_multi_option` (Boolean), `hide_total_price` (Boolean), `include_itinerary` (Boolean), `remove_terms` (Boolean), `use_similar_hotel_wording` (Boolean)

**`QuoteOption`** *(new — supports multi-option quotes: Deluxe/Luxury/Premium in one shareable doc)*
- `id`, `quote_id` (FK), `option_label` (String, e.g. "Deluxe"), `is_default` (Boolean), `total_selling_price` (Decimal)

**`QuoteDay`**
- `id`, `quote_option_id` (FK), `day_number`, `title`, `description` (Text)

**`QuoteItem`**
- `id`, `quote_day_id` (FK), `item_type` (Enum: `HOTEL`, `TRANSPORT`, `ACTIVITY`, `FLIGHT`, `CUSTOM`)
- `inventory_id` (FK, nullable — links to Part 3 master data), `custom_name` (String, if manually typed)
- `cost_price`, `selling_price` (Decimal), `is_foc` (Boolean — Free-of-Cost line, Sembark's documented convention)
- `markup_type` (Enum: `PERCENT`, `FLAT`, nullable — only populated when `pricing_strategy = PER_COMPONENT*`)
- `tax_basis` (Enum: `COST_PLUS_MARKUP`, `MARKUP_ONLY`, nullable), `tax_rate_id` (FK → `TaxType`, nullable)
- `pickup_location`, `drop_location` (String, nullable — transport/activity specific, Sembark v1.173)

**`FlightSegment`** *(new)*
- `id`, `quote_id` (FK), `trip_type` (Enum: `ONE_WAY`, `ROUND_TRIP`, `MULTI_CITY`, `CONNECTING`)
- `entry_method` (Enum: `API_SEARCH`, `MANUAL`), `airline`, `flight_number`, `origin_airport`, `destination_airport`
- `departure_time`, `arrival_time`, `travel_class`, `baggage_allowance`, `meal_type`, `fare_type`
- `cost_price`, `selling_price` (Decimal — **both mandatory**: Sembark hides a flight from the quote output entirely if either is missing, which is a real documented gotcha to replicate as validation, not a silent bug)

**`TaxType`** *(org-configurable, not hardcoded — Sembark supports GST/VAT/TCS/custom + an explicit "N/A" type to suppress the tax label entirely)*
- `id`, `organization_id` (FK), `name`, `rate_percent`, `is_inclusive` (Boolean)

**`QuoteTemplate`** *(new — PDF/Email branding config)*
- `id`, `organization_id` (FK), `name`, `font_family`, `section_order` (Array of section keys — e.g. itinerary-first vs. price-first layouts are both real configurations Sembark supports)
- `show_activity_timing` (Boolean), `is_branded` (Boolean — Sembark v1.175's Branded/Non-Branded PDF split, built for DMCs quoting through B2B agents who need their *own* branding on the same package)
- `greeting_rich_text` (Text), `header_banner_url`, `footer_banner_url`

### B. API Endpoints to Scaffold

- **Quote Engine:**
  - `POST /api/trips/:tripId/quotes` (init), `PUT /api/quotes/:id` (save full itinerary payload)
  - `POST /api/quotes/:id/options` (add a Deluxe/Luxury/Premium option)
  - `POST /api/quotes/:id/apply-fixed-package` ("Use This" — Sembark lets agents save & reuse fixed packages)
  - `GET /api/quotes/suggestions?destination=&duration=&pax=` (past-quote reuse matching — see Part 9 for the AI-assisted version)
- **Flights:**
  - `GET /api/flights/search?...` (content-API search — Sabre GDS integration point, stretch)
  - `POST /api/quotes/:id/flights` (manual or API-selected entry)
- **PDF & Sharing:**
  - `POST /api/quotes/:id/generate-pdf`, `POST /api/quotes/:id/share` (returns WhatsApp text / email HTML per the toggles)
  - `GET/PUT /api/quote-templates/:id` (branding config)
- **Pricing utility (internal, not client-facing):**
  - `computeQuotePricing(quoteId)` — pure function, see Technical Constraints for the exact strategy branching.

## Feature Specifications — UI/UX Requirements

### A. The Quote Builder Interface
- Dynamic form engine: `react-hook-form` + `useFieldArray` for add/remove Days, and within each day, Hotels/Transport/Activities/Flights.
- Hotel/Transport/Activity autocomplete → falls through to the Part 3 Quick Add modal on no-match.
- **Multi-option toggle:** duplicates the current day structure into a second/third `QuoteOption` tab (Deluxe/Luxury/Premium), letting the agent vary only the hotel tier per option rather than rebuild the whole itinerary.
- **Reorder-between-days:** Sembark explicitly does *not* support drag-and-drop reordering within the quote UI — instead, "move all services from Day A to Day B" as a bulk action. Build the simpler bulk-move interaction, not drag-and-drop; it's a deliberate scope-saver that matches the real product, not a shortcut Raaj is settling for.

### B. Pricing & Markup Panel
- Strategy selector: Overall / Per-Person / Per-Component / Per-Component-Per-Person, shown as a one-time choice per quote (changing it mid-build should warn that it recalculates all line totals).
- Per-component mode surfaces markup (%/flat) and tax basis (Cost+Markup vs. Markup-Only) inline on each `QuoteItem` row, not in a separate settings page — this is what makes it usable at quoting speed.
- FOC entries: a simple "Mark as FOC" checkbox per item, which zeroes the selling price but keeps the cost price for margin reporting.

### C. Share Package Modal
- Tabs: WhatsApp / Email / PDF.
- Toggles (exact Sembark set): `Hide Total Price`, `Include Itinerary`, `Remove Terms`, `Use "or similar" wording for hotels`.
- WhatsApp tab: plain-text preview using `*bold*` markdown, "Send via WhatsApp" opens `https://wa.me/?text=...`.
- Email tab: rich-text preview rendered from the org's `QuoteTemplate`.
- PDF tab: "Download PDF" (Branded) +, if the trip's `TripSource` is a B2B agent, a second "Download Non-Branded PDF" option.

## Technical Constraints
- **Pricing computation must branch cleanly on `pricing_strategy`:**
  - `OVERALL`: one markup/tax applied to the itinerary total.
  - `PER_PERSON`: total ÷ pax, markup/tax applied per-person, then re-multiplied — rounding must happen once, at the end, not per intermediate step (a real source of off-by-one-cent bugs).
  - `PER_COMPONENT` / `PER_COMPONENT_PER_PERSON`: markup and tax resolved individually on each `QuoteItem` per its own `markup_type`/`tax_basis`, then summed. This is the mode that needs the most test coverage.
- **Server-side PDF rendering only** — Puppeteer (`puppeteer-core` + `@sparticuz/chromium` on Vercel/Lambda), never client-side `jspdf`/`html2canvas` (breaks page-break and text-selection quality). Render a hidden React template, `page.pdf({ format: 'A4', printBackground: true })`.
- **Flight validation:** reject a `FlightSegment` from quote output if either `cost_price` or `selling_price` is null — matches the documented Sembark behavior exactly rather than silently showing a $0 flight.
- **Quote Suggestions matching** (v1.0, pre-AI): a straightforward filter on destination + duration ± 1 night + pax range from past `ACCEPTED` quotes, surfaced as "similar past quotes" — the semantic/AI-ranked version is a Part 9 upgrade, not a Part 4 requirement.

**AI Raaj Delegation Split:** ~65% agent-buildable (schema, CRUD, PDF pipeline, standard UI). The ~35% needing Raaj's hands-on review: the exact per-component tax/markup rounding rules (get this wrong and every quote's margin math is silently off), and the Quote PDF's visual template — brand quality on the client-facing document is not something to fully delegate to an agent's default styling.

## Success Metrics
- A 5-day, 2-hotel-option itinerary is built and PDF-shared in under 5 minutes by a first-time user (Sembark's "60 seconds" figure is the itinerary-selection step alone, not full quote-to-share).
- Per-component markup/tax totals match a manually-calculated spreadsheet to the cent, across all 4 pricing strategies, in QA.
- Zero quotes ship with a flight missing either cost or selling price.

---

# PRD Part 5: Operations, Dispatch & Smart Calendars
**Reference:** Sembark Operational Bookings, Assign Service Provider, Share Service Details, Trip Vouchers, Activity Bookings & Vouchers, Hotel Booking Update Status/Vouchers/Enquiries/Changes & Drops, Self-Booked Accommodations, Check-Ins and Outs docs.

**Product/Version:** Travel CRM — Part 5 — v1.0
**Problem Statement:** An accepted quote is a promise; this module is where the promise gets kept — assigning real suppliers, real drivers, real hotel confirmations to what was sold, and giving Operations a calendar view of everything moving on any given day.
**Target User(s):** Operations/Reservations staff (daily), Sales agents (checking booking status for a client).
**Core Use Cases:**
- See every hotel check-in/out and every cab movement happening today, at a glance.
- Turn a quoted hotel line into a confirmed booking with a supplier confirmation number, and generate a voucher instantly.
- Assign a driver and vehicle to a transfer, and share the right details with the guest and the driver — separately, since they need different information.
- Swap a hotel after booking (a "change") or cancel it with charges (a "drop") without losing the audit trail.
- Track a hotel the client booked themselves, so it still shows on the trip's overall itinerary and voucher.
**Out of Scope (this part):** Whether/how the supplier gets paid (Part 6); the original quote pricing (Part 4).

## Feature Specifications

### A. Core Database Schema (Prisma/SQL)

**`ServiceBooking`** *(the confirmed operational component — one per `QuoteItem` that gets actioned)*
- `id`, `trip_id` (FK), `quote_item_id` (FK), `supplier_id` (FK → Part 3 `Supplier`)
- `status` (Enum: `PENDING_CONFIRMATION`, `ENQUIRY_SENT`, `CONFIRMED`, `VOUCHER_GENERATED`, `CHANGED`, `DROPPED`, `CANCELLED`)
- `supplier_confirmation_number`, `cost_price` (Decimal, locked at confirmation — independent of any later `RateSheet` change)
- `is_self_booked` (Boolean — guest/agency booked outside Sembark/this system via a third-party portal or corporate tie-up; still tracked for itinerary completeness)
- `payment_preference_rule_id` (FK → `PaymentPreferenceRule`, see Part 6), `payment_due_date` (DateTime, derived)
- `drop_cancellation_charge` (Decimal, nullable), `replaced_by_service_booking_id` (FK, nullable — chains a "change")

**`DispatchAssignment`** *(vehicle & driver allocation, transport-type bookings only)*
- `id`, `service_booking_id` (FK), `driver_name`, `driver_phone`, `cab_type`, `vehicle_number`

**`Voucher`**
- `id`, `service_booking_id` (FK), `type` (Enum: `HOTEL`, `TRANSPORT`, `ACTIVITY`, `TRIP`)
- `pdf_url` (signed, non-public S3 URL), `qr_code_data` (String, nullable — Activity vouchers carry a QR + ticket number per Sembark)
- `generated_at`, `is_edited_after_generation` (Boolean — Sembark allows reopening/editing a generated voucher, tracked here)

### B. API Endpoints to Scaffold

- **Smart Calendars:**
  - `GET /api/operations/calendar/trips?startDate=&endDate=` (trips active in range)
  - `GET /api/operations/calendar/hotel-checkins?startDate=&endDate=` (hotel-wise grid: hotels on Y-axis, dates on X-axis)
  - `GET /api/operations/calendar/movement-chart/download?date=` (Sembark's own named export — a printable/exportable day sheet of every arrival/departure/movement)
- **Supplier Bookings, Enquiries & Changes:**
  - `PUT /api/service-bookings/:id` (assign supplier, add confirmation number, update status)
  - `POST /api/service-bookings/:id/send-enquiry` (auto-generated booking-enquiry email/WhatsApp to the hotel, with guest details + room availability pre-filled, unified subject line — matches Sembark's "1-min reply" positioning)
  - `POST /api/service-bookings/:id/change` (replace hotel/service, chains via `replaced_by_service_booking_id`)
  - `POST /api/service-bookings/:id/drop` (`{ cancellationCharge }` — triggers the refund-installment logic in Part 6 if the amount paid exceeds the charge)
  - `POST /api/service-bookings/self-booked` (guest/agency self-booked entry)
  - `POST /api/service-bookings/:id/apply-payment-rule`
- **Dispatch & Vouchers:**
  - `POST /api/dispatch/:serviceBookingId`
  - `GET /api/dispatch/:serviceBookingId/share-text?audience=guest|driver|provider`
  - `POST /api/service-bookings/:id/generate-voucher`, `PUT /api/vouchers/:id` (edit-after-generation)

## Feature Specifications — UI/UX Requirements

### A. Smart Calendars Interface
- Built on `react-big-calendar` or `@fullcalendar/react`.
- **Operational Bookings view:** continuous grid, trips span days as colored blocks.
- **Hotel Check-In/Out view:** hotel names on Y-axis, dates on X-axis, occupancy blocks.
- Both views accept a bounded date range only — see Technical Constraints.

### B. Booking & Payment Preference UI
- Trip's "Operations" tab lists all sold services with an "Assign Supplier" dropdown next to each.
- "Set Payment Preference" modal shows the exact calculated due date (e.g. "Due on: 21 Aug, 2026") **before** save, not after — Sembark treats this preview as non-negotiable UX because a wrong due date is an accounting problem, not a display bug.

### C. Dispatch Share Modal (Guest vs. Driver vs. Service Provider)
- Three tabs, each generating audience-appropriate text — a guest gets pickup time/location/driver contact; a driver gets the day-wise itinerary and passenger contact; a service provider gets the booking-confirmation format.
- "Send via WhatsApp" per tab.

### D. Voucher Generators (Hotel / Activity / Trip)
- Hotel voucher: agency branding, guest/pax details, check-in/out dates, meal plan, supplier confirmation number, billing instructions ("Bill to [Agency]. Extras on direct basis").
- Activity voucher: adds QR code + ticket number + optional file attachment (Sembark supports attaching a supplier-issued PDF alongside the generated voucher).
- Trip voucher: full itinerary + hotels + transfers + support contact, with customizable title/section order and an A3 print/download option.

## Technical Constraints
- **Calendar queries must be range-bounded server-side** — `GET /api/operations/calendar/*` requires `start_date`/`end_date` and filters at the DB layer; never fetch a full year of bookings to the browser.
- **Change vs. Drop are distinct, chained operations, not overwrites.** A "change" creates a new `ServiceBooking` linked via `replaced_by_service_booking_id` and marks the old one `CHANGED` — the original cost/history stays queryable. A "drop" is terminal and, per a real Sembark support pattern, **generates an automatic refund installment** if `cost_price` already paid exceeds the `drop_cancellation_charge` — that refund installment logic must live in Part 6's `ClientLedger`/`SupplierLedger`, triggered from here.
- **Voucher PDFs are never publicly accessible** — signed S3 URLs or an authenticated proxy route, not a guessable public path.
- **Dynamic due-date math** (`date-fns`/`dayjs`, server-side): e.g. `100% 5 days after month-end of service end` → find `Trip.end_date` → end of that month → +5 days. Save the resolved `payment_due_date`, don't recompute it live on every accounting page load.

**AI Raaj Delegation Split:** ~75% agent-buildable (calendar plumbing, CRUD, voucher templates, dispatch text generation). The ~25% needing Raaj's judgment: the exact refund-installment trigger conditions on a drop (business-rule sensitive — wrong here means a client either isn't refunded correctly or is refunded when they shouldn't be), and the voucher PDF's branded visual layout.

## Success Metrics
- Hotel Check-In/Out calendar renders a 30-day window for 500+ concurrent bookings without a client-side freeze.
- 100% of "drop" actions with prior payment correctly generate (or correctly suppress) a refund installment, per the documented rule.
- Driver-facing share text never includes client pricing; guest-facing share text never includes supplier cost — verified as an automated test, not a manual spot-check.

---

# PRD Part 6: Financial Accounting, Ledgers, Payment Gateway & Analytics
**Reference:** Sembark Accounting Overview, Proforma Invoices, Incoming/Outgoing Payments, Payment Gateway, Payment Receipts, Payment Preferences, Ledgers and Downloads, Sales/Profit & Checkout Reports docs.

**Product/Version:** Travel CRM — Part 6 — v1.0
**Problem Statement:** This is the module Sembark's reviews credit most directly for cash-flow impact ("payment collection reminders help with cash flow… profits are more than double"). It's also where a bug is most expensive — an accounting module has zero tolerance for orphaned or double-counted transactions.
**Target User(s):** Accountant/Admin (daily reconciliation), Sales agents (checking what a client still owes), Ops (checking what's owed to a supplier).
**Core Use Cases:**
- See every collectable and every payable, sorted by due date, in one dashboard each.
- Log a payment in seconds and have every downstream number (ledger balance, status, profit report) update atomically.
- Generate a proforma invoice from an accepted quote with billing/GST details already filled in.
- Let a client pay directly via a payment link instead of a manual bank-transfer chase.
- Know, per trip, per agent, per destination, exactly how much profit was made — correctly, even when some bookings are still pending.
**Out of Scope (this part):** How a service got costed in the first place (Part 4); how a supplier gets confirmed (Part 5).

## Feature Specifications

### A. Core Database Schema (Prisma/SQL)

**`Account`** *(new — generalizes the v1 draft's separate Client/Supplier ledgers into Sembark's real "Accounting Account" model, which also covers credit-card/cash accounts)*
- `id`, `organization_id` (FK), `type` (Enum: `CLIENT`, `SUPPLIER`, `INTERNAL` — e.g. a named credit card or cash drawer)
- `linked_trip_source_id` (FK, nullable), `linked_supplier_id` (FK, nullable)
- `is_disabled` (Boolean — accounts are disabled, not deleted, when unused)

**`ClientLedger`** (Accounts Receivable)
- `id`, `trip_id` (FK, unique), `account_id` (FK), `total_billed_amount`, `total_paid_amount` (default 0)
- `currency`, `next_due_date` (nullable), `status` (Enum: `UNPAID`, `PARTIAL`, `PAID_IN_FULL`)

**`SupplierLedger`** (Accounts Payable)
- `id`, `service_booking_id` (FK, unique), `account_id` (FK), `trip_id` (FK)
- `total_cost_amount`, `total_paid_amount` (default 0), `currency`, `due_date`, `status` (Enum, as above)

**`FinancialTransaction`** (immutable record of money movement)
- `id`, `entity_type` (Enum: `CLIENT_PAYMENT`, `SUPPLIER_PAYMENT`), `entity_id` (FK → ledger)
- `transaction_date`, `amount`, `currency`, `payment_mode` (Enum: `BANK_TRANSFER`, `CASH`, `CREDIT_CARD`, `UPI`, `PAYMENT_GATEWAY`)
- `reference_number`, `remarks`, `logged_by_user_id` (FK), `is_verified` (Boolean — Sembark distinguishes *logged* from *verified* collections)
- `is_refund` (Boolean — refund installments from Part 5 drops post here too)

**`PaymentPreferenceRule`** *(new — the reusable rule referenced from Part 5, both client- and supplier-side)*
- `id`, `organization_id` (FK), `applies_to` (Enum: `CLIENT`, `SUPPLIER`), `rule_key` (e.g. `"100_PCT_5D_AFTER_MONTH_END_OF_SERVICE"`, `"100_PCT_2D_BEFORE_SERVICE"`)
- `installment_breakdown` (JSON, nullable — Sembark auto-generates installment schedules based on trip timing/duration/package value, not just a single due date)

**`ProformaInvoice`**
- `id`, `trip_id` (FK), `invoice_number`, `buyer_billing_details` (JSON — auto-filled from `TripSource`/Organization but editable)
- `line_items` (JSON array — separate Hotel/Land/Activity amounts supported, not forced into one lump sum)
- `tax_type_id` (FK, nullable), `include_hsn_code` (Boolean), `template_id` (FK → `InvoiceTemplate`, customizable title/T&Cs)
- `pdf_url`

**`PaymentGatewayTransaction`** *(new — Paddle integration)*
- `id`, `client_ledger_id` (FK), `gateway` (Enum: `PADDLE` — pluggable for future regional gateways per Part 0's constraint)
- `gateway_transaction_id`, `payment_link_url`, `status` (Enum: `PENDING`, `SUCCEEDED`, `FAILED`, `EXPIRED`), `webhook_last_event_at`

### B. API Endpoints to Scaffold

- **Payment Dashboards:**
  - `GET /api/finance/incoming?filter=past7|today|upcoming|overdue|paid` (sorted by `next_due_date` ASC)
  - `GET /api/finance/outgoing?filter=...` (same filter set, supplier side)
- **Transaction Processing (Critical — see Technical Constraints):**
  - `POST /api/finance/transaction/client`, `POST /api/finance/transaction/supplier`
  - `POST /api/finance/transaction/bulk-clear` (Sembark v1.171's bulk payment clearance — log several payments in one submission)
  - `POST /api/finance/transaction/:id/verify` (log → verify as a two-step, not implicit)
  - `POST /api/finance/transaction/:id/revert` (blocked if the trip `is_locked`; Admin must unlock first — matches a real Sembark FAQ exactly)
- **Payment Gateway:**
  - `POST /api/finance/payment-links` (`{ clientLedgerId }` → creates a Paddle-hosted payment link, "pay-ready quotation")
  - `POST /api/webhooks/paddle` (payment confirmation → auto-creates the `FinancialTransaction` + updates `ClientLedger`)
- **Invoices & Receipts:**
  - `POST /api/trips/:id/proforma-invoice`, `PUT /api/proforma-invoices/:id`
  - `POST /api/finance/transaction/:id/receipt` (generate a receipt PDF for a verified payment)
- **Ledgers & Reports:**
  - `GET /api/accounts/:id/statement?month=` / `?startDate=&endDate=` (Tally/CA-ready export)
  - `POST /api/accounts/:id/merge` (duplicate account cleanup)
  - `GET /api/reports/sales?groupBy=agent|destination|source`
  - `GET /api/reports/profit-checkout` (must surface a **pending-bookings warning banner** when the trip's Reservations/Operations status isn't fully confirmed — see Technical Constraints)
  - `GET /api/reports/suppliers/:supplierId/trip-wise`

## Feature Specifications — UI/UX Requirements

### A. Incoming & Outgoing Payments Dashboard
- Sidebar filters: Past 7 Days, Today, Upcoming, Overdue, Paid.
- Row: Currency + Amount Due (prominent), Due Date badge (red/orange/gray), Trip ID + Client/Supplier name, inline "Add Comment" box, "Log Payment" button.

### B. The "Log Payment" Modal
- Fields: Amount (pre-filled with remaining balance, editable for partials), Date, Payment Method, Reference ID, Remarks.
- `[x] Update Next Due Date` toggle for partial payments.
- A gateway-collected payment shows as a read-only row (from the webhook) with a "Verify" action rather than a manual entry form.

### C. Sales & Conversion / Profit Reports View
- Shadcn Data Table, sortable/paginated. Columns: Name (Agent/Destination/Source), Total Leads, Total Quotes, Conversions, Conversion %, Dropped, Pax, Revenue, Profit.
- Date-range picker at top; summary cards showing revenue **grouped by currency**, never summed.
- Custom column presets, save/reuse (Sembark v1.170/v1.171 explicitly ship this — accountants and sales heads want different default columns).

## Technical Constraints
- **Database ACID transactions are non-negotiable.** Every `POST /api/finance/transaction/*` uses Prisma `$transaction()`: (1) insert `FinancialTransaction`, (2) update `total_paid_amount` on the parent ledger, (3) if `total_paid_amount >= total_billed_amount`, flip status to `PAID_IN_FULL`. Any step failing rolls back the whole chain — never an orphaned payment row.
- **Locked trips block payment reverts** at the API layer, not just the UI — `POST /api/finance/transaction/:id/revert` must check `trip.is_locked` server-side even if the button is hidden client-side.
- **Profit calculation must warn on pending bookings, not silently under/over-report:** `Profit = Quote.total_selling_price − SUM(ServiceBooking.cost_price)` for `CONFIRMED` bookings; if any linked `ServiceBooking` is still `PENDING_CONFIRMATION`, the report includes a visible "profit may change — N bookings pending" banner rather than a false-precision number. This matches a documented, real Sembark support answer about why profit reports look "wrong."
- **One package = one currency, by design.** Do not build cross-currency split-payment support for a single `ClientLedger` in v1.0 — Sembark's own team has this as an open, unresolved feature request, not a solved pattern to copy. Treat multi-currency-per-package as explicitly out of scope rather than a gap to improvise around.
- **Dynamic date-diff labels:** frontend uses `date-fns` (`formatDistanceToNowStrict`) against a backend-returned raw `due_date` to render `"Due: Today"` / `"Due: In 2 days"` / `"Overdue: By 5 days"`.
- **Payment Gateway (Paddle):** webhook-driven, idempotent by `gateway_transaction_id` (a replayed webhook must not double-post a `FinancialTransaction`).
- **CSV/Excel export** on every ledger/report page (`react-csv` or a `text/csv` server stream) — accountants need this for external audits/Tally imports, not a nice-to-have.

**AI Raaj Delegation Split:** ~60% agent-buildable (schema, CRUD, ACID transaction wiring, dashboard/report UI). The ~40% needing Raaj's direct review: the Paddle webhook idempotency and reconciliation logic (payment bugs are the costliest bug class in this whole PRD), and the exact installment-breakdown auto-generation rules in `PaymentPreferenceRule` — these encode real business judgment about how Raaj wants to structure client payment schedules by trip value/timing.

## Success Metrics
- Zero orphaned `FinancialTransaction` rows under simulated concurrent-request/failure testing.
- A Paddle webhook replay (same event twice) results in exactly one `FinancialTransaction`, not two.
- Profit report pending-bookings banner appears in 100% of test cases where a linked `ServiceBooking` is not yet `CONFIRMED`.

---

# PRD Part 7: Integrations, Notification Engine & AI Automation Layer
**Reference:** Sembark Integrations (Leads Integration, WordPress/Google-Form/Wix/BotPenguin connectors), Notify (WhatsApp Automation) add-on, AI Email Parsing (release v1.176), Trip Plan Requests distribution rules.

**Product/Version:** Travel CRM — Part 7 — v1.0 (P2 — Differentiation phase)
**Problem Statement:** This is the part where Travel CRM stops being a Sembark clone and starts being an AI Raaj module. Sembark itself only shipped AI Email Parsing in v1.176 (recent, per its own release notes) — Raaj's stack (n8n + Claude/OpenAI/Gemini APIs + WhatsApp Business API) is *already* built for exactly this kind of automation, ahead of where most of Sembark's install base is.
**Target User(s):** Admin (configuring automation rules once), every role (as the beneficiary of automated reminders/notifications), AI Raaj (as the eventual autonomous operator of this layer).
**Core Use Cases:**
- A lead from a WordPress form, Meta Ad, Google Ad, or chatbot lands in `TripPlanRequest` automatically, with zero manual data entry.
- An email inquiry sent to the company inbox becomes a lead automatically, with the full email thread preserved against the trip.
- A guest gets an automatic WhatsApp update the moment their booking status, payment status, or trip date changes — without an agent remembering to send it.
- Heavy jobs (PDF generation, bulk email) never block the UI.
**Out of Scope (this part):** The core CRM data model these automations write into (Parts 2–6 already define it) — this part is the wiring, not the destination tables.

## Feature Specifications

### A. Core Database Schema (Prisma/SQL)

**`IntegrationConnection`**
- `id`, `organization_id` (FK), `type` (Enum: `WEBSITE_FORM`, `META_ADS`, `GOOGLE_ADS`, `CHATBOT`, `EMAIL_INBOX`, `GOOGLE_FORM`, `WIX`)
- `api_key_hash` (String — for the public webhook endpoint's auth), `config` (JSON — e.g. IMAP credentials for email sync, encrypted at rest), `is_active` (Boolean)

**`NotifyRule`** *(the "Notify" add-on equivalent — trigger-based WhatsApp automation)*
- `id`, `organization_id` (FK), `trigger_event` (Enum: `BOOKING_CONFIRMED`, `PAYMENT_DUE_REMINDER`, `PAYMENT_RECEIVED`, `TRIP_STARTING_TOMORROW`, `VOUCHER_GENERATED`, `FOLLOW_UP_DUE`)
- `channel` (Enum: `WHATSAPP`, `EMAIL`), `template_id` (String — Meta-approved WhatsApp template name), `recipient_type` (Enum: `GUEST`, `ASSIGNED_AGENT`, `SUPPLIER`), `is_active` (Boolean)

**`EmailThread`** *(new — supports AI Email Parsing)*
- `id`, `organization_id` (FK), `trip_plan_request_id` (FK, nullable), `trip_id` (FK, nullable)
- `raw_message_id`, `from_address`, `subject`, `body_text`, `received_at`
- `ai_parse_status` (Enum: `PENDING`, `PARSED`, `LOW_CONFIDENCE_NEEDS_REVIEW`, `FAILED`), `ai_extracted_fields` (JSON), `ai_confidence_score` (Float)

**`WebhookDeliveryLog`** *(new — every inbound/outbound automation call gets a record, for the error-fallback pattern below)*
- `id`, `integration_connection_id` (FK, nullable), `direction` (Enum: `INBOUND`, `OUTBOUND`), `payload` (JSON), `status` (Enum: `SUCCESS`, `FAILED`, `RETRYING`), `error_message` (Text, nullable), `attempted_at`

### B. Automation Pipelines (trigger → transformation → action → fallback)

**Pipeline 1 — Omnichannel Lead Capture**
- **Trigger:** `POST /api/leads/webhook` (API-key-protected, public endpoint) fires from Meta Lead Ads, Google Ads, WordPress forms, Google Forms, Wix, or a chatbot (BotPenguin-style), routed and orchestrated by **n8n** rather than bespoke per-source server code.
- **Data transformation:** n8n normalizes each source's payload shape into `{ source, guest_name, phone, email, destination_text }`, validated against a Zod schema before it ever reaches the Next.js API.
- **Action output:** creates/updates a `TripPlanRequest` in `UNASSIGNED` status; applies the org's round-robin or destination-based auto-distribution rule (Part 2) if configured; fires a `NotifyRule` (internal Slack/WhatsApp ping to the sales team) on new-lead arrival.
- **Error fallback:** malformed payloads are rejected with a `400` and logged to `WebhookDeliveryLog` rather than silently dropped; n8n retries transient failures (5xx from the app) 3× with backoff before flagging for manual review.

**AUTOMATION PIPELINE APPLICATION:** Every paid ad channel and every landing page Raaj's ventures run (Nepal Inbound DMC, the OTA platform) points at this one endpoint via n8n, so adding a new lead source is an n8n workflow change, not a code deploy.
**REAL-WORLD USE CASE:** A Meta Lead Ad for a Nepal trekking package fires → n8n normalizes and posts to `/api/leads/webhook` → a `TripPlanRequest` appears in the dashboard within seconds, auto-assigned to whichever agent owns "Trekking" destinations that week.

**Pipeline 2 — AI Email Parsing**
- **Trigger:** a new message lands in a monitored inbox (IMAP sync, matching Sembark's own v1.176/v1.179 release notes), captured as an `EmailThread` row.
- **Data transformation:** n8n passes the email body to the **Claude API** (chosen for structured-extraction reliability) with a schema-constrained prompt to extract `{ guest_name, phone, email, destination, dates, pax, budget_hint }`; a confidence score is returned alongside the extraction.
- **Action output:** confidence ≥ threshold → auto-creates a `TripPlanRequest` (or appends to an existing `Trip`'s thread if the sender matches an existing `Guest`); confidence < threshold → status `LOW_CONFIDENCE_NEEDS_REVIEW`, surfaced in the Trip Plan Requests inbox for a human to confirm rather than silently guessing.
- **Error fallback:** parse failures log to `ai_parse_status = FAILED` with the raw email preserved — a human always has the original text, never just a failed AI's partial guess.

**AUTOMATION PIPELINE APPLICATION:** This is the first real "AI does the first 80%, human does the last 20%" pattern in the whole CRM — the direct architectural precursor to AI Raaj triaging Raaj's own inbound inquiries.
**REAL-WORLD USE CASE:** A B2B agent emails "Need a 6N/7D Kathmandu-Pokhara package for 4 pax in October, budget around $800pp" — the parser extracts destination, duration, pax, and a budget hint, creates a qualified `TripPlanRequest`, and the assigned agent opens it already knowing what to quote instead of re-reading the email first.

**Pipeline 3 — Notify (Trigger-Based WhatsApp/Email Automation)**
- **Trigger:** any `NotifyRule.trigger_event` firing from the core app (e.g. `ServiceBooking.status → CONFIRMED`, `ClientLedger.next_due_date` within 48h).
- **Data transformation:** the app emits a lightweight event (via a Postgres trigger → outbox table, or a direct n8n webhook call) with the relevant IDs; n8n resolves the full context (guest name, trip details, amount due) and renders the Meta-approved WhatsApp template.
- **Action output:** message sent via WhatsApp Business API (Meta Cloud API); delivery status (Sent/Delivered/Read) written back via the `POST /api/webhooks/whatsapp` listener.
- **Error fallback:** a failed send (invalid number, template rejected) logs to `WebhookDeliveryLog` and raises an in-app notification to the assigned agent — automation failing silently on a payment reminder is worse than not automating it at all.

**AUTOMATION PIPELINE APPLICATION:** This is Raaj's Notify-add-on equivalent, built on infrastructure (n8n + WhatsApp Business API) he already owns rather than a paid Sembark add-on.
**REAL-WORLD USE CASE:** A client's installment is due in 2 days → Notify auto-sends a WhatsApp payment reminder with the amount and a Paddle payment link → if unpaid in 24h, a second, slightly firmer template fires automatically → the agent only gets involved if it's still unpaid after that.

### C. API Endpoints to Scaffold
- `POST /api/leads/webhook` (API-key protected, public)
- `GET/PUT /api/integrations` (connection management)
- `GET/POST/PUT /api/notify-rules`
- `POST /api/webhooks/whatsapp` (delivery status listener)
- `POST /api/webhooks/email-inbound` (n8n → app handoff after IMAP capture, or direct provider webhook)
- `POST /api/ai/parse-email` (internal — called by n8n, wraps the Claude API call + schema validation)

## Feature Specifications — Background Jobs & Async Queues
- **Do not run PDF generation or bulk email/WhatsApp sends in the request-response cycle.** On Vercel: **Upstash QStash** or **Inngest**; on a dedicated Node server: **BullMQ + Redis**.
- Flow: user clicks "Generate Voucher & Email" → API returns `{ status: "processing" }` immediately (toast notification) → job queued (`queue.add('generate-hotel-voucher', { bookingId })`) → worker generates the PDF (Puppeteer), uploads to storage, sends the email.
- **Scheduled jobs (cron):** daily at 01:00 Kathmandu time — scan `ClientLedger`/`SupplierLedger` and flag `OVERDUE`; scan `Trip` records for the 1-year archival threshold (Part 2).

## Technical Constraints
- **n8n owns cross-system orchestration; the Next.js app owns transactional correctness.** Anything that touches money or booking status must still go through the app's own ACID-guarded API (Part 6) — n8n calls that API, it never writes to Postgres directly. This keeps the automation layer swappable without risking data integrity.
- **Every external API route is Zod-validated and rate-limited** (Upstash Redis rate limiting) — the lead webhook and email-parse endpoints are the most likely targets for spam/abuse given they're public-facing.
- **AI extraction is assistive, never authoritative below the confidence threshold** — this is a hard rule, not a tuning preference: a `LOW_CONFIDENCE_NEEDS_REVIEW` `TripPlanRequest` must never silently auto-convert to a `Trip`.
- **WhatsApp templates must be pre-approved by Meta** before `NotifyRule` can reference them — the build must include a template-registration checklist as an ops task, not assume templates exist.

**AI Raaj Delegation Split:** ~55% agent-buildable (webhook plumbing, n8n workflow scaffolding, queue wiring). The ~45% needing Raaj's judgment: the AI email-parsing confidence threshold (too low = bad data enters the pipeline; too high = defeats the automation's purpose) and the exact Notify rule set/timing/tone for each trigger — reminder cadence and tone are brand-voice decisions, not engineering ones.

## Success Metrics
- Lead webhook end-to-end latency (ad click → visible `TripPlanRequest`) under 10 seconds for 95% of events.
- AI email parsing achieves ≥80% auto-qualify rate (confidence above threshold) on real inbound inquiry volume within the first month, reviewed and tuned monthly.
- Zero payment-related WhatsApp sends double-fire on a webhook retry (idempotency verified).

---

# PRD Part 8: Security, Multi-Tenancy, Administration & Deployment
**Reference:** Sembark Account Security, 2FA, User Management & Roles, Multi-Branding, System Status page, and general platform hardening implied throughout the docs (encryption, RBAC, audit logs referenced in release notes v1.157/v1.164/v1.176).

**Product/Version:** Travel CRM — Part 8 — v1.0
**Problem Statement:** This is the cross-cutting part that every other part silently depends on. A travel CRM holds passport scans, payment references, and supplier contracts — the security bar has to match Sembark's own explicit marketing claims (encryption, RBAC, passkeys, regular audits), not a generic SaaS baseline.
**Target User(s):** Super Admin/Admin (configuring), every user (protected by), Raaj (as the eventual multi-tenant SaaS operator selling this to other DMCs).
**Core Use Cases:**
- No user, however senior, can accidentally query another organization's data.
- An error anywhere in the app degrades gracefully instead of crashing the whole screen.
- The system is observably healthy — Raaj (or a future ops hire) can see what broke and when, without digging through server logs blind.
- The whole stack deploys with one merge to `main`, safely, every time.
**Out of Scope (this part):** Feature-specific RBAC rules (each part specifies its own — this part is the enforcement mechanism, not the rule list).

## Feature Specifications

### A. Multi-Tenant Data Isolation
- Even as a single-agency tool today, the schema is multi-tenant from day one — every table that isn't pure lookup data carries `organization_id`.
- **Every** Prisma query includes `where: { organization_id: user.orgId }` — enforced via a Prisma middleware/extension that injects this filter automatically, rather than trusting every hand-written query to remember it. A single missed filter is a cross-tenant data leak; this cannot be a discipline problem, it has to be structurally impossible.

### B. Authentication & Session Security
- **NextAuth.js (Auth.js)** for credential/session management; **HttpOnly, Secure** session cookies (XSS-resistant).
- **Passkeys (WebAuthn)** as the primary passwordless option, **TOTP 2FA** as a secondary layer, admin-forceable org-wide.
- **Rate limiting:** IP-based (Upstash Redis) on `/api/auth/login` and `/api/leads/webhook` specifically — the two most brute-force/spam-exposed endpoints.
- **Revocable per-user permissions** (`UserPermissionOverride`, Part 1) audited on change — who granted/revoked what, when.

### C. Audit Logging *(new — implied by Sembark's own "Hotel Activity Log," "Transport/Activity logs," and "report activity tracking for admins" release notes)*
- **`AuditLog`** table: `id`, `organization_id` (FK), `actor_user_id` (FK), `entity_type`, `entity_id`, `action` (Enum: `CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`), `diff` (JSON, before/after on changed fields), `created_at`.
- Written on every mutation to `Hotel`, `RateSheet`, `TransportService`, `Quote`, `ServiceBooking`, and any `FinancialTransaction` — the exact set of entities Sembark itself calls out as having change-history in its release notes.

### D. Global Error Handling, Logging & Validation
- **Input validation:** Zod on every API route's `req.body`/`req.query` — malformed input is a `400`, never a Prisma crash.
- **Centralized error mapping:** `401` (invalid JWT), `403` (RBAC denial), `404` (not found — including "not found in *your* org," which must look identical to a true 404 to avoid leaking existence of other orgs' records), `500` (unexpected).
- **Frontend error boundaries:** major UI modules (dashboard cards, quote builder, calendar) wrapped individually — one broken chart shows a localized "Failed to load" fallback, not a blank screen.
- **Application monitoring:** Sentry (`@sentry/nextjs`) for unhandled exceptions in production.

### E. Deployment Strategy
- **Frontend & API:** Vercel — zero-config Next.js deploys, edge caching, auto-scaling serverless functions.
- **Database:** Supabase (managed PostgreSQL with PgBouncer connection pooling — required for serverless).
- **File storage:** Supabase Storage or AWS S3/Cloudflare R2, strict CORS limited to the Vercel domain.
- **Cache & queues:** Upstash Redis.
- **CI/CD:** `.github/workflows/deploy.yml` — on PR to `main`: `npm run lint` + `npx prisma validate`; on merge to `main`: auto-deploy to Vercel production.
- **Environment template (`.env.example`):**

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/dbname?pgbouncer=true"

# Authentication
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="https://crm.yourtravelcompany.com"

# Storage
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""

# Integrations
WHATSAPP_API_TOKEN=""
RESEND_API_KEY=""
N8N_WEBHOOK_BASE_URL=""
PADDLE_API_KEY=""
PADDLE_WEBHOOK_SECRET=""

# AI
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
GEMINI_API_KEY=""

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=""
```

## Technical Constraints
- **A system-status page is worth building early**, not deferred — Sembark runs a public status page (`sembark.statuspage.io`); even a minimal `/status` route reading recent Sentry/uptime data builds the same trust signal for Raaj's own future SaaS customers.
- **Multi-Branding (Part 1's `Brand` model) is a Part 8 stretch item**, not v1.0-required — ship single-brand-per-org first; the schema already supports it, the UI to switch branding mid-session does not need to.
- **RBAC + multi-tenancy checks belong in middleware, not in every individual route handler** — write it once, apply it everywhere, so a new API route can't forget it.

**AI Raaj Delegation Split:** ~80% agent-buildable (middleware, error boundaries, CI/CD config, env scaffolding). The ~20% needing Raaj's judgment: which entities get audit-logged first (cost/complexity trade-off) and the actual go-live security review before any real client payment data touches the system — this last step should never be fully AI-delegated regardless of the March 2027 autonomy target.

## Success Metrics
- A simulated cross-tenant query attempt (manually crafted request for another org's trip ID) returns 404, not data.
- Sentry captures 100% of unhandled server-side exceptions in a staging smoke test.
- CI blocks a merge to `main` on lint or Prisma-schema failure, verified with an intentionally broken test PR.

---

# PRD Part 9: AI & Agentic Layer Roadmap
**Reference:** No direct Sembark equivalent — this part is Raaj's differentiation layer, positioned against Sembark's current AI surface area (AI Email Parsing, v1.176, is Sembark's only shipped AI feature as of this research pass).

**Product/Version:** Travel CRM — Part 9 — v0.1 (Phase 3, post-MVP)
**Problem Statement:** Sembark automates the CRM's *plumbing*. It does not draft quotes, negotiate follow-up tone, or reason about a client's stated budget against inventory. That gap is exactly where AI Raaj's ~70%-autonomy-by-March-2027 target has room to operate — and where a from-scratch build has a real, defensible edge over cloning a feature list.
**Target User(s):** AI Raaj (as the primary actor for automatable steps), sales agents (as the human-in-the-loop reviewer/approver).
**Core Use Cases:**
- An inbound lead gets a first-draft quote reply before a human agent even opens it.
- A stale `IN_PROGRESS` lead gets an AI-drafted, on-brand follow-up nudge, queued for one-click human approval.
- Quote Suggestions (Part 4) rank by semantic similarity, not just date/pax filters — "similar past trips" that actually reads like similar trips.
- Every AI action is logged with its confidence and its outcome, so the human-review rate is a trackable number that should fall over time, not a permanent tax.
**Out of Scope (this part):** Full autonomous payment negotiation or supplier contracting — out of scope for any phase of this roadmap; those stay human-owned regardless of the autonomy target.

## Feature Specifications

### A. AI Raaj Delegation Map — Across the Whole PRD

| Workflow | Human-owned today | AI-assisted (Phase 3 target) | Fully AI-owned (post-March 2027, exception-only human review) |
|---|---|---|---|
| Lead capture & qualification | Manual entry, manual triage | AI email/WhatsApp parsing (Part 7) drafts the `TripPlanRequest` | Auto-qualify above confidence threshold |
| First quote draft | Agent builds from scratch | AI drafts itinerary + pricing from Quote Suggestions (below), agent edits/approves | Auto-send for low-value/repeat-pattern trips only |
| Follow-up nudges | Agent remembers/writes manually | AI drafts on-brand nudge text, agent approves send | Auto-send with an opt-out flag per trip |
| Payment reminders | Agent manually chases | Notify engine (Part 7) — already rules-based, not "AI" per se | Same — this doesn't need to get smarter, just reliable |
| Supplier negotiation & contracting | Fully human | Not planned | **Never** — explicitly out of scope |
| Pricing/margin decisions | Fully human (Sales Head review) | AI surfaces suggested markup based on past-quote patterns | Human sign-off always required — margin is a business decision, not a data-lookup |

### B. Quote Suggestions v2 — Semantic Reuse (upgrade to Part 4's v1.0 filter-based version)
- **Trigger:** agent opens "Suggestions" on a new quote, or the AI drafting flow (below) needs a starting template.
- **Data transformation:** embed the new trip's `{destination, duration, pax, budget_hint}` using an embedding model (OpenAI or Gemini embeddings — cost/latency-appropriate for a fast autocomplete-style call); compare against embeddings of past `ACCEPTED` quotes (pre-computed, stored, refreshed on quote acceptance).
- **Action output:** ranked list of similar past quotes, each cloneable into the new `Quote` as a starting `QuoteDay`/`QuoteItem` set.
- **Error fallback:** empty result falls back cleanly to Part 4's v1.0 filter-based suggestions — never a blank "no suggestions" dead end.

**AUTOMATION PIPELINE APPLICATION:** This directly compounds Raaj's stated moat — the 10,000+ real WhatsApp travel conversations and Nepal operational knowledge base become higher-value the more past-quote data feeds this embedding index.
**REAL-WORLD USE CASE:** A new 5N/6D Kathmandu-Pokhara-Chitwan lead for 2 pax surfaces last month's near-identical accepted quote for a different client, pre-populated and ready to adjust rather than built from a blank itinerary.

### C. Example — "AI Trip Assistant" Agent System Prompt (illustrative, for the eventual in-app drafting assistant)
*Delivered in the required 8-block order, as a template Raaj can drop into the Claude API call inside the quote-drafting flow:*

**IDENTITY:** You are the AI Trip Assistant for [Organization Name]'s Travel CRM — a drafting aid for sales agents building quotes, not a customer-facing agent.
**BEHAVIORAL RULES:** Never invent a hotel, price, or availability not present in the org's Master Data (Part 3); never finalize or send a quote — every draft requires human approval before it leaves draft status; always cite which past quote(s) or rate sheet rows a suggestion is based on.
**KNOWLEDGE CONTEXT:** Has read access to `RateSheet`, `Itinerary` templates, and the org's `ACCEPTED` `Quote` history (via the embedding index above) — no access to other organizations' data, ever.
**CONVERSATION FLOW:** Agent states trip parameters (destination, dates, pax, budget) → Assistant proposes a day-wise structure with sourced pricing → Agent edits inline → Assistant recalculates totals per the active `pricing_strategy` (Part 4) on each edit.
**TONE & STYLE GUIDE:** Concise, numbers-forward, no marketing language in the drafting conversation itself (marketing tone belongs in the client-facing quote template, not the internal drafting chat).
**EDGE CASE HANDLING:** No valid rate found for requested dates → say so explicitly and suggest the nearest valid season, never estimate a price. Ambiguous destination → ask one clarifying question rather than guessing.
**OUTPUT FORMAT RULES:** Structured `QuoteDay`/`QuoteItem` JSON matching Part 4's schema, plus a one-line human-readable summary — never freeform prose the agent has to manually re-enter.
**ESCALATION PROTOCOL:** Any requested price override beyond the org's configured markup floor routes to a "flag for Sales Head" state rather than silently complying.

### D. AI Action Audit Trail
- **`AIActionLog`:** `id`, `organization_id` (FK), `action_type` (Enum: `EMAIL_PARSE`, `QUOTE_DRAFT`, `FOLLOWUP_DRAFT`, `SUGGESTION_RANK`), `input_ref`, `output_ref`, `confidence_score`, `human_decision` (Enum: `APPROVED`, `EDITED`, `REJECTED`, `AUTO_APPROVED`), `created_at`.
- This table *is* the metric for "70% autonomy by March 2027" — the `AUTO_APPROVED` rate over time, per `action_type`, is the number to actually track against that target, rather than a felt sense of automation.

## Technical Constraints
- **LLM routing follows Raaj's confirmed stack split:** Claude API for structured extraction/drafting tasks (Pipelines in Part 7, Quote Assistant above); Gemini API where live/current information is genuinely needed; OpenAI API as the embeddings/fallback option. No task in this part should call an LLM for something a deterministic rule (Part 4's pricing engine, Part 6's ledger math) already handles correctly — AI drafts content, it does not recompute money.
- **Every AI-assisted action is reversible and logged before it's autonomous** — `AIActionLog.human_decision` must be populated for every action in Phase 3; the jump to any `AUTO_APPROVED` path happens per-workflow, only after its edited/rejected rate has been observed low enough to trust, not on a fixed calendar date.

**AI Raaj Delegation Split:** This entire part *is* the delegation layer, so the split is the deliverable — see the map in section A. The one constant across every row: **pricing/margin sign-off and supplier contracting stay human-owned indefinitely**, independent of the March 2027 target.

## Success Metrics
- `AIActionLog` shows a rising `AUTO_APPROVED` rate month over month for at least one workflow (Quote Suggestions or Follow-up Drafts) within the first quarter after Phase 3 ships.
- Zero AI-drafted quotes reference a hotel/rate not present in Master Data (hallucination rate = 0%, tested adversarially).
- Human-edit rate on AI-drafted follow-ups trends downward as the org's past-quote/past-conversation index grows.

---

## Closing Note on Sourcing

Every Sembark-specific claim in this document (feature names, release-note details, documented FAQ behaviors like "drops can't be reverted" or "flights need both cost and selling price to appear") was pulled from Sembark's own live, public documentation and release notes during this research pass, not reconstructed from a screen recording or general travel-CRM knowledge. Where Sembark's own team has flagged something as an open gap (e.g., no split-currency payment on one package), this PRD treats it as an explicit non-goal rather than a target to quietly exceed — matching the "minimalistic complexity" brief rather than over-building.
