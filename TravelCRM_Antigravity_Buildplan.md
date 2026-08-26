# Travel CRM — Antigravity Build Playbook

**Companion to:** `TravelCRM_PRD_v2.md` (10-part master PRD)
**Target tool:** Google Antigravity (agentic IDE — Agent Manager, Planning/Fast modes, Artifacts, project Rules, Workflows)
**How to use this file:** Every fenced block under a "▶ Prompt" heading is written to be copy-pasted directly into an Antigravity Agent Manager task. Run them **in order** — each phase assumes the previous phase's schema and auth layer already exist in the repo.

---

## How This Playbook Maps to Antigravity's Actual Mechanics

| Antigravity concept | How this playbook uses it |
|---|---|
| **Rules** (persistent, project-level instructions every agent reads first) | Section A below — paste once into Antigravity's project Rules, before Task 1. |
| **Planning mode** (produces Task List + Implementation Plan artifacts you review before code is written) | Default mode for every prompt in this file — non-trivial schema/business-logic work. Do not use Fast mode for anything touching money (Parts 6, 9) or auth (Part 1, 8). |
| **Fast mode** (skips planning, executes directly) | Only suggested for small, low-risk follow-up fixes noted inline (e.g. styling tweaks). |
| **Artifacts** (Task List, Implementation Plan, Code Diffs, Walkthrough, Browser verification recording) | After every task, review the **Implementation Plan** artifact against this playbook's "Check before approving" line, then review the **Walkthrough** + browser recording against the "Verify" line. |
| **Workflows** (saved, reusable `/command` prompts) | Section F flags the 3 patterns in this build that repeat 2+ times — save these as Workflows the first time you write them, don't retype them. |
| **Agent Mode setting** (Review-driven / Agent-assisted / Agent-driven) | Use **Agent-assisted development** for this whole project — Antigravity runs terminal commands automatically but you approve major/destructive actions. Given this app touches client payments and passport data, do not run Phase 2 (Part 6) or Phase 3 (Part 7/9) in full Agent-driven/"Autopilot" mode. |
| **Model assignment** | Gemini for broad-codebase scaffolding, boilerplate CRUD, and UI (Parts 1–3, 5, 8). Switch to Claude for anything with precise financial/pricing logic or multi-step debugging (Parts 4's pricing engine, Part 6 in full, Part 7's AI parsing pipeline) — accuracy matters more than speed there. |

---

# Section A: One-Time Project Setup

### A.1 — Antigravity Project Rules (paste into the Rules panel before Task 1)

```
PROJECT: Travel CRM SaaS (Sembark-parity build)
SPEC OF RECORD: TravelCRM_PRD_v2.md, part-numbered. Always read the full relevant Part before planning a task — do not infer schema from filenames or guess at fields not listed in the spec.

STACK — DO NOT SUBSTITUTE:
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS + Shadcn UI
- State: Zustand (client) + TanStack React Query (server state/caching)
- Backend: Next.js API routes, Prisma ORM, PostgreSQL (via Supabase)
- Auth: NextAuth.js (Auth.js) + WebAuthn passkeys + TOTP 2FA
- Validation: Zod on every API route body/query
- Storage: Supabase Storage (signed URLs for anything client-financial or passport-related)
- Background jobs: BullMQ + Redis (Upstash) — never run PDF generation or bulk sends synchronously
- PDF: server-side Puppeteer only, never client-side jspdf/html2canvas
- Payments: Paddle (do not implement Stripe or any other gateway unless explicitly instructed in a future task)
- Automation orchestration (webhooks, WhatsApp, AI email parsing): n8n calls this app's API — do not have n8n write to Postgres directly
- Monitoring: Sentry (@sentry/nextjs)

CROSS-CUTTING RULES (apply to every task, every part):
1. Every Prisma query must be scoped to organization_id — this is a multi-tenant SaaS from day one, even though the first real tenant is a single DMC.
2. Never hard-delete Hotel, TransportService, TravelActivity, TripSource, or Account records — archive or merge only, per Part 3/6.
3. Every mutation to Hotel, RateSheet, TransportService, Quote, ServiceBooking, or FinancialTransaction writes an AuditLog row (Part 8).
4. Money-touching endpoints (Part 6) must use Prisma $transaction() — never a partial write.
5. Do not invent business rules not in the spec (e.g. payment due-date formulas, tax logic) — if a task needs a decision the spec doesn't make, stop and ask rather than guessing.
6. Match Sembark's documented conventions exactly where the spec cites one (e.g. bulk-import cell conventions in Part 3, FOC handling in Part 4) — these aren't arbitrary, they're what the spec's source research found in Sembark's real product.

WHEN IN DOUBT: prefer the simpler, more "minimalistic complexity" implementation described as v1.0 scope in each Part over a more elaborate one — features explicitly marked "stretch" or "Phase 3" in PRD Part 0 should not be built early even if they'd be easy to add while you're in the same file.
```

### A.2 — Repo Scaffold (Planning mode)

▶ **Prompt A.2 — Initialize the repository**
```
Initialize a new Next.js 14+ (App Router) TypeScript project for a multi-tenant Travel CRM SaaS.

Set up:
- Tailwind CSS + Shadcn UI (init with the default Shadcn config, add the button, card, table, dialog, dropdown-menu, tabs, and form components to start)
- Prisma with a PostgreSQL datasource (use a DATABASE_URL env var, do not hardcode credentials)
- ESLint + Prettier with a standard TypeScript config
- A `.env.example` file with the variables listed in PRD Part 8 Section E (do not fill in real values)
- A `.github/workflows/deploy.yml` that runs `npm run lint` and `npx prisma validate` on pull requests to main, and deploys to Vercel on merge to main (leave Vercel secrets as placeholders)
- Project folder structure: /app for routes, /components for shared UI, /lib for utilities (including a placeholder lib/prisma.ts client singleton), /prisma for schema

Do not scaffold any business-logic schema yet — this task is infrastructure only. Confirm the dev server runs and the Tailwind/Shadcn setup renders a blank styled page before finishing.
```
**Check before approving (Implementation Plan):** confirm it is NOT trying to add business tables yet — this task should be infra-only.
**Verify:** ask Antigravity to launch the dev server and screenshot the blank app in its browser-verification step.

---

# Section B: Phase 0 — Foundation (PRD Parts 1 + 8)

*Nothing else in this build works without this phase. Build it fully before starting Phase 1.*

▶ **Prompt B.1 — Organization, User & Auth schema (Part 1, Section A)**
```
Using PRD Part 1 ("Architecture, Authentication & Organization Core") as the full specification, implement the Prisma schema for: Organization, Brand, BillingAddress, BankAccount, User, Team, UserPermissionOverride, and Passkey — exactly as fielded in Part 1 Section A. Include the role enum exactly as listed (SUPER_ADMIN, ADMIN, SALES_HEAD, SALES_PERSON, OPERATIONS, RESERVATIONS, DATA_OPERATOR, ACCOUNTANT).

Also implement, per PRD Part 8, a Prisma middleware/extension that automatically injects `where: { organization_id }` into every query on tenant-scoped tables, so this can't be forgotten in later phases.

Run `npx prisma migrate dev` and confirm the schema applies cleanly. Do not build any API routes or UI yet — this task is schema only.
```
**Check before approving:** the Prisma extension for auto-org-scoping is present and the Implementation Plan explains *how* it intercepts queries (this is the single most important safety mechanism in the whole app — read this part of the plan carefully, don't rubber-stamp it).
**Verify:** ask for a quick test script demonstrating a query without an explicit org filter still gets scoped correctly.

▶ **Prompt B.2 — Auth flows: login, passkeys, 2FA (Part 1, Sections B–C)**
```
Using PRD Part 1 as the spec, implement:
- NextAuth.js (Auth.js) credential-based login with HttpOnly/Secure session cookies
- WebAuthn passkey registration and login (use @simplewebauthn/server), matching Sembark's passwordless-login pattern described in the spec
- TOTP-based 2FA (use otplib), with an org-level "force 2FA" admin setting
- The auth API endpoints listed in Part 1 Section B exactly: POST /api/auth/login, POST /api/auth/webauthn/register, POST /api/auth/webauthn/login, POST /api/auth/2fa/verify, POST /api/auth/logout, GET /api/auth/me
- The Login screen per Part 1's UI spec: minimalist centered card, email+password, "Forgot Password," "Remember Me" toggle, white background, centered logo placeholder

Enforce the RBAC route-guard rules from Part 1 Section "Technical Constraints" — SALES_PERSON scoped to assignedTo === user.id, ADMIN/SALES_HEAD org-wide, OPERATIONS/RESERVATIONS excluded from pricing fields, ACCOUNTANT full ledger access without quote-edit rights. Since Trip/Quote models don't exist yet, stub the guard logic against a placeholder resource so it's ready to apply in Phase 1.
```
**Check before approving:** the plan should show the RBAC guard as a reusable middleware function, not duplicated per-route logic.
**Verify:** have Antigravity's browser agent complete a full login → passkey registration → logout cycle and capture the recording.

▶ **Prompt B.3 — Org settings, user/team management UI (Part 1, remaining sections + Part 8 error handling)**
```
Using PRD Part 1's remaining API endpoints (Organization Module, User & Team Management) and Part 8's Global Error Handling spec, build:
- The Organization Settings screens (tabbed: Profile, Users, Currencies stub for now) per Part 1's UI spec
- Users data table (User Name, Role, User Since, Recent Activity, Status with green/red dot) with an "Invite Member" button
- Team creation/assignment UI
- Zod validation on every route added in this task
- Centralized API error handler mapping to 401/403/404/500 per Part 8 Section D
- React ErrorBoundary wrapping the settings module
- Sentry initialization (@sentry/nextjs) with a placeholder DSN

This completes Phase 0. Before finishing, run through the full flow once: Super Admin signs up → sets org profile → invites a second user with SALES_PERSON role → confirms that user can log in and is correctly RBAC-scoped.
```
**Check before approving:** confirm the end-to-end flow described in the last paragraph is explicitly part of the plan's verification step, not just the build steps.
**Verify:** review the Walkthrough artifact for the full signup→invite→scoped-login flow; this is the Phase 0 exit criteria from PRD Part 0 Section D.

---

# Section C: Phase 1 — Sellable MVP (PRD Parts 2 + 3 + 4)

*Goal: a lead can become a priced, shareable quote. Build Part 3 (master data) before Part 4 (quoting) — the quote builder depends on it.*

▶ **Prompt C.1 — CRM core schema: Trips, Guests, Follow-ups (Part 2, Section A)**
```
Using PRD Part 2 as the spec, implement the Prisma schema for: Guest, GuestDocument, TripPlanRequest, Trip, Tourist, FollowUp, and TripTask — exactly as fielded in Part 2 Section A, including the trip_display_id generation logic (Organization.trip_prefix + sequence) and the status enums as listed.

Pay particular attention to the Technical Constraints section: Hold, Cancel, and Drop must be modeled as three distinct actions with different guard conditions (a Dropped trip cannot be reverted; a pre-conversion Cancel can be). Do not collapse these into one generic "status change" action.

Migrate and confirm the schema applies cleanly against the Phase 0 Organization/User tables.
```
**Check before approving:** confirm Hold/Cancel/Drop are three separate mutations in the plan, not one parameterized status-setter.

▶ **Prompt C.2 — Master data schema & bulk import (Part 3)**
```
Using PRD Part 3 as the spec, implement:
- The full master-data schema: TripDestination, Supplier, Hotel, HotelRoom, RateSheet, TransportService, TravelActivity, Itinerary, TripSource
- The rate-resolution function described in Part 3's Technical Constraints (destination → season date-range → occupancy → weekday/weekend → sales/ops split), which must hard-fail with a clear error on no valid match rather than falling back to a stale price
- Bulk import for Hotels and Rate Sheets: client-side parsing (papaparse/SheetJS) before upload, with the exact cell conventions documented in Part 3 Section B (room-count/occupancy suffix, double-bracket vendor tagging, Sales/Ops season-column suffixes) — implement the parser to these conventions precisely, they are not arbitrary
- Merge (not delete) endpoints for Hotels and Trip Sources
- The "Download Sample Template" endpoint generating an XLSX with the required columns

Do not build the Quick Add modal in this task — that's part of the Quote Builder in the next task, since it lives inside that UI even though it writes to this schema.
```
**Check before approving:** read the plan's description of the bulk-import cell-convention parser closely — this is the highest-density, easiest-to-get-subtly-wrong logic in this task. If the plan doesn't explicitly mention parsing `(40R)(2P)`-style suffixes and `[[VENDOR]]` bracket tags, send it back before approving.
**Verify:** test the bulk import with a small sample sheet using at least one of each documented convention.

▶ **Prompt C.3 — Trip pipeline, dashboard & Trip Plan Requests UI (Part 2, Sections B–D)**
```
Using PRD Part 2's UI/UX and API specs, build:
- The Smart Dashboard with the 4 cards specified (Trip Sales Stats, Pending Follow-ups, Live Trips, Trip Plan Requests inbox) plus the notification bell
- The Trips List / Lead Pipeline screen with status tabs, compact lead cards, click-to-dial (tel: links), and the stale-activity warning icon
- The Trip Plan Requests screen (separate from the Trips pipeline, per the spec) with bulk-assign
- The Guest & Tourist panel inside Trip Details, including the "Request Documents" secure-upload-link flow (generate a token, do not build the actual WhatsApp/email send yet — that's Part 7 — just generate and display the link for now)
- The manual "Add New Query" flow that creates a Guest + Trip

Use TanStack React Query with a 5-minute staleTime on pipeline tab queries so tab switching is instant, per the Technical Constraints.
```
**Check before approving:** confirm the currency-grouped revenue aggregation on the dashboard uses Prisma groupBy and returns per-currency arrays — not a summed total. This is explicitly called out as a common bug class in the spec.
**Verify:** browser-test adding a lead manually, then confirm it's immediately findable via Global Search.

▶ **Prompt C.4 — Quotation engine schema & pricing logic (Part 4, Sections A + Technical Constraints)**
```
Using PRD Part 4 as the spec, implement:
- The full schema: Quote, QuoteOption, QuoteDay, QuoteItem, FlightSegment, TaxType, QuoteTemplate
- The computeQuotePricing(quoteId) pure function implementing all 4 pricing strategies exactly as branched in the Technical Constraints section (Overall, Per-Person, Per-Component, Per-Component-Per-Person) — pay specific attention to the rounding rule: round once at the end, not at each intermediate step
- Flight validation: a FlightSegment must have both cost_price and selling_price non-null to appear in quote output, matching Sembark's documented behavior exactly

Write unit tests for computeQuotePricing covering all 4 strategies against hand-calculated expected totals before moving to the UI in the next task. This is the highest financial-accuracy-risk logic in the MVP — do not skip the test coverage to save time.
```
**Check before approving:** require the plan to include unit tests as a deliverable, not an optional follow-up. This task should probably run under Claude rather than Gemini per the model-assignment guidance in this playbook's header table.
**Verify:** ask to see the actual test output/pass results in the Walkthrough artifact, not just "tests added."

▶ **Prompt C.5 — Quote Builder UI, Quick Add, sharing & PDF (Part 4, remaining sections)**
```
Using PRD Part 4's remaining spec, build:
- The Quote Builder: react-hook-form + useFieldArray for Days → Hotels/Transport/Activities/Flights, with autocomplete search against Part 3's master data
- The Quick Add modal (Hotel/Transport/Activity), implemented via React Portal + an independent Zustand store so the parent quote form never loses state — this state-preservation requirement is explicit in the spec, verify it with a manual test where you type into several quote fields, open Quick Add, and confirm nothing is lost
- Multi-option quotes (Deluxe/Luxury/Premium tabs)
- The Pricing & Markup panel with the strategy selector and per-component markup/tax controls
- Server-side PDF generation via Puppeteer (puppeteer-core + @sparticuz/chromium) — do not use any client-side PDF library
- The Share Package modal (WhatsApp/Email/PDF tabs) with the exact toggle set from the spec (Hide Total Price, Include Itinerary, Remove Terms, "or similar" wording)

This completes Phase 1. Before finishing, run the full flow: create a lead → build a 3-day itinerary with 2 hotel options → apply Per-Component pricing → generate and download the PDF → generate WhatsApp share text.
```
**Check before approving:** confirm the plan explicitly tests the Quick-Add state-preservation requirement — this is the one most likely to be silently broken by a naive implementation (any full-form re-render on modal open fails it).
**Verify:** this is the Phase 1 exit criteria from PRD Part 0 — a full lead-to-shared-quote flow, timed, should complete well under 5 minutes.

---

# Section D: Phase 2 — Operate & Collect (PRD Parts 5 + 6)

*Goal: a quote becomes a run trip with tracked cash. Build Part 5 before Part 6 — Supplier Ledgers depend on ServiceBooking existing.*

▶ **Prompt D.1 — Operations schema, supplier bookings & change/drop logic (Part 5, Section A + Technical Constraints)**
```
Using PRD Part 5 as the spec, implement:
- The schema: ServiceBooking, DispatchAssignment, Voucher — exactly as fielded, including is_self_booked and the replaced_by_service_booking_id chaining field
- The Change vs. Drop logic as two distinct, non-overwriting operations per the Technical Constraints: a "change" creates a new ServiceBooking linked via replaced_by_service_booking_id and marks the old one CHANGED; a "drop" is terminal and must trigger an automatic refund-installment check against amount already paid vs. the drop cancellation charge (stub the actual ledger write for now — the ClientLedger/SupplierLedger tables don't exist until Task D.3, but leave a clear TODO marker and the correct trigger point in the code)
- The booking-enquiry auto-generation endpoint (auto-fills guest details + room availability into a unified-subject-line email/WhatsApp draft to the hotel)

Do not build the calendar UI in this task — schema and API only.
```
**Check before approving:** confirm the plan treats Change and Drop as genuinely separate code paths, and that it leaves an explicit, findable TODO for the refund-installment ledger write rather than silently skipping it.

▶ **Prompt D.2 — Smart calendars, dispatch & voucher UI (Part 5, remaining sections)**
```
Using PRD Part 5's UI spec, build:
- The Operational Bookings calendar (continuous grid, trips as colored blocks) and the Hotel Check-In/Out calendar (hotels on Y-axis, dates on X-axis) using react-big-calendar or @fullcalendar/react — both must accept bounded start_date/end_date query params server-side, never fetch a full year to the browser
- The "Set Payment Preference" modal showing the calculated due date before save
- The Dispatch Share modal (Guest / Driver / Service Provider tabs) generating audience-appropriate text — verify with a specific test that the driver-facing text never includes client pricing and the guest-facing text never includes supplier cost
- The Hotel/Activity/Trip Voucher generators, with signed (non-public) storage URLs

Load-test the Hotel Check-In/Out calendar against at least 500 seeded bookings across a 30-day window before finishing this task.
```
**Check before approving:** the "never includes client pricing / supplier cost" cross-check should be an explicit automated or at-minimum scripted test in the plan, not a manual eyeball check — this is a real data-leak risk between guest and driver communications.

▶ **Prompt D.3 — Accounting schema & ACID transaction logic (Part 6, Section A + Technical Constraints)**
```
Using PRD Part 6 as the spec, implement:
- The schema: Account, ClientLedger, SupplierLedger, FinancialTransaction, PaymentPreferenceRule, ProformaInvoice, PaymentGatewayTransaction
- The core payment-logging logic wrapped in Prisma $transaction(): insert FinancialTransaction → update ledger total_paid_amount → flip status to PAID_IN_FULL if fully paid — any step failing must roll back the entire chain
- The locked-trip guard on payment reverts: POST /api/finance/transaction/:id/revert must check trip.is_locked server-side, returning 403 if locked, regardless of what the UI shows
- Now go back and complete the Part 5 refund-installment TODO from Task D.1, wiring the drop-triggered refund check into this ledger logic

Write a test that simulates a failed transaction mid-chain (e.g. force an error after the FinancialTransaction insert but before the ledger update) and confirms zero orphaned rows result.
```
**Check before approving:** this task should explicitly close the loop from D.1's TODO — if the plan doesn't mention it, send it back. Also confirm the rollback test is a real deliverable, not a description of intent.
**Verify:** ask to see the rollback test's actual pass output.

▶ **Prompt D.4 — Payment dashboards, Proforma invoices & Paddle integration (Part 6, remaining sections)**
```
Using PRD Part 6's remaining spec, build:
- The Incoming/Outgoing Payments dashboards with the exact filter set (Past 7 Days, Today, Upcoming, Overdue, Paid) and the date-diff labels via date-fns formatDistanceToNowStrict
- The "Log Payment" modal with partial-payment and due-date-update handling
- Proforma Invoice generation from an accepted Quote, auto-filling billing/GST details from TripSource/Organization, with separate line items per Hotel/Land/Activity
- Paddle payment-link creation (POST /api/finance/payment-links) and a webhook handler (POST /api/webhooks/paddle) that is idempotent by gateway_transaction_id — write a specific test that replays the same webhook payload twice and confirms only one FinancialTransaction is created
- The Sales & Profit reports view, including the pending-bookings warning banner described in the spec (never show a false-precision profit number when a linked ServiceBooking isn't yet CONFIRMED)
- CSV/Excel export on every ledger and report page

This completes Phase 2. Before finishing, run the full flow: confirm a hotel booking → log a partial client payment → generate a Paddle payment link → simulate the webhook firing → confirm the ledger updates exactly once.
```
**Check before approving:** the webhook-idempotency test is the single most important check in this task — confirm it's explicitly planned, not assumed.
**Verify:** this is the Phase 2 exit criteria from PRD Part 0 — supplier cost and client collection must both reconcile to zero variance against the accepted quote in this test run.

---

# Section E: Phase 3 — Automate & Differentiate (PRD Parts 7 + 9)

*Goal: this is where the app stops being a Sembark clone. Run this phase in Agent-assisted mode with close review — it touches external integrations and AI-generated content.*

▶ **Prompt E.1 — Lead webhook, n8n handoff & Notify schema (Part 7, Sections A–B Pipeline 1 & 3)**
```
Using PRD Part 7 as the spec, implement:
- The schema: IntegrationConnection, NotifyRule, WebhookDeliveryLog
- POST /api/leads/webhook: API-key-protected, Zod-validated against the normalized {source, guest_name, phone, email, destination_text} shape, rate-limited via Upstash Redis, creating/updating a TripPlanRequest — log every call (success or failure) to WebhookDeliveryLog
- The Notify trigger points: emit a lightweight event on ServiceBooking status changes and ClientLedger due-date-approaching conditions, callable by an external n8n workflow
- POST /api/webhooks/whatsapp delivery-status listener

Do not build the actual n8n workflows in this task — that happens in n8n itself, outside this codebase. This task builds the API surface n8n calls into and the webhook receivers n8n calls back to.
```
**Check before approving:** confirm rate limiting and Zod validation are both explicitly present in the plan for the public lead-webhook endpoint — this is the most exposed surface in the whole app.

▶ **Prompt E.2 — AI email parsing pipeline (Part 7, Pipeline 2)**
```
Using PRD Part 7's AI Email Parsing pipeline spec, implement:
- The EmailThread schema and POST /api/ai/parse-email internal endpoint, designed to be called by an n8n workflow after IMAP capture
- A Claude API call with a schema-constrained prompt extracting {guest_name, phone, email, destination, dates, pax, budget_hint} plus a confidence score
- The confidence-threshold branch: above threshold auto-creates a TripPlanRequest; below threshold sets ai_parse_status to LOW_CONFIDENCE_NEEDS_REVIEW and surfaces it in the existing Trip Plan Requests inbox (Part 2) rather than a new screen
- Always preserve the raw email body against the EmailThread row, even on a parse failure

This is an AI-authoritative-below-threshold rule, not a suggestion: write a test confirming a low-confidence extraction never auto-creates a fully-qualified Trip, only a flagged TripPlanRequest.
```
**Check before approving:** confirm the plan does not let any confidence level skip straight to a `Trip` record — even "high confidence" should land as a `TripPlanRequest` per Part 2's model, since a human still converts it explicitly.
**Verify:** test with one clearly-worded inquiry email and one deliberately ambiguous one, and confirm they route differently.

▶ **Prompt E.3 — Background jobs & scheduled tasks (Part 7, Background Jobs section)**
```
Using PRD Part 7's Background Jobs spec, implement BullMQ + Redis (Upstash) queues for:
- PDF generation and email/WhatsApp sending (move the Part 4/Part 5 synchronous calls to these queues if they aren't already queued — check the existing implementation first)
- A daily 01:00 Kathmandu-time cron job scanning ClientLedger/SupplierLedger and flagging OVERDUE records
- A daily cron job flagging Trip records past the 1-year mark as is_archived

Confirm no PDF generation or bulk send currently blocks a request-response cycle anywhere in the app — audit Parts 4, 5, and 6's existing implementations as part of this task, not just new code.
```
**Check before approving:** this task explicitly asks for an audit of prior phases — make sure the plan actually includes checking Parts 4–6, not just adding new queued jobs.

▶ **Prompt E.4 — AI Action audit trail & Quote Suggestions v2 (Part 9)**
```
Using PRD Part 9 as the spec, implement:
- The AIActionLog schema, written to by every AI-assisted action in the app (the Part 7 email parser at minimum; wire it into any other AI call already in the codebase)
- Quote Suggestions v2: embed new-trip parameters and past ACCEPTED quotes (OpenAI or Gemini embeddings), rank by similarity, with a clean fallback to Part 4's original filter-based suggestions when the embedding index returns nothing
- A human_decision field update path: when an agent approves/edits/rejects an AI-drafted suggestion, that decision writes back to the corresponding AIActionLog row

Do not implement full autonomous auto-send for any workflow in this task — per the spec, every AUTO_APPROVED path is a future decision made per-workflow after observing a low edited/rejected rate, not something to hardcode now.
```
**Check before approving:** confirm the plan does not add any auto-send/auto-approve behavior — this task is logging and suggestion-ranking only, per the spec's explicit constraint.

---

# Section F: Recurring Patterns — Save These as Antigravity Workflows

These three request-shapes repeat 2+ times across the phases above. The first time you write one, save it as an Antigravity Workflow (triggered with `/name` in agent chat) instead of retyping it:

1. **`/quick-add-modal`** — "Add a Quick Add modal for [entity] following the Part 3 pattern: React Portal, independent Zustand store, minimal fields only, does not reset the parent form." (Used for Hotels in Part 3/4, and reusable for Transport/Activities.)
2. **`/acid-ledger-write`** — "Wrap this money-touching mutation in Prisma $transaction(): write the transaction record, update the ledger total, flip status if fully settled, roll back everything on any failure." (Used repeatedly across Part 6 and the Part 5 refund-installment logic.)
3. **`/currency-grouped-aggregate`** — "Write a Prisma groupBy query on currency for this metric, returning a per-currency array — never SUM across currencies." (Used on the dashboard, sales reports, and payment dashboards.)

---

# Section G: Cross-Phase QA Prompt (run after every phase)

▶ **Prompt G — Regression & multi-tenancy check**
```
Before marking this phase complete, run a regression pass:
1. Create a second Organization with its own Super Admin and confirm zero data from the first organization is visible or queryable from the second, across every screen touched in this phase.
2. Re-run the end-to-end flow from the previous phase's final task and confirm it still passes.
3. Check the AuditLog table (Part 8) has entries for every mutation performed during this phase's testing.
Report any failure as a blocker, not a note — do not mark the phase done with an open multi-tenancy leak.
```

---

## Closing Note

This playbook is sequenced for a solo builder working with one Antigravity Agent Manager thread per task, in Planning mode, reviewing the Implementation Plan artifact before code is written each time. If parallelizing across multiple agents (Antigravity supports concurrent tasks), the safe parallel pairs are: **C.2 (master data) alongside B.3 (org settings UI)**, and **D.1 (ops schema) alongside D.3's schema-only portion** — everything else has a real dependency on the task before it and should stay sequential.
