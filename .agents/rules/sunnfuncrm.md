---
trigger: always_on
---

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
7. Keep `docs/tutorial/` updated as each build phase and task proceeds, maintaining step-wise tutorials, architecture explanations, and shortcuts for vibe coders.

WHEN IN DOUBT: prefer the simpler, more "minimalistic complexity" implementation described as v1.0 scope in each Part over a more elaborate one — features explicitly marked "stretch" or "Phase 3" in PRD Part 0 should not be built early even if they'd be easy to add while you're in the same file.
