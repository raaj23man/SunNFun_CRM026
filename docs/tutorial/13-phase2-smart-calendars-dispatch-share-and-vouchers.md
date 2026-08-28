# 13. Phase 2 — Operations Smart Calendars, Dispatch Share & Vouchers

> **What was built in this milestone:**
> - **High-Performance Smart Calendars** (`components/operations/HotelCheckinCalendar.tsx`, `components/operations/OperationalBookingsCalendar.tsx`, `app/(dashboard)/operations/calendar/page.tsx`):
>   - **Hotel Check-In/Out Grid**: Hotels on Y-axis, Dates on X-axis with sticky headers/labels, load-tested against 500+ concurrent bookings.
>   - **Operational Trips Timeline**: Continuous movement radar across bounded date intervals (`start_date` and `end_date` bounded server-side).
> - **Set Payment Preference Modal** (`components/operations/SetPaymentPreferenceModal.tsx` & `POST /api/service-bookings/:id/apply-payment-rule`):
>   - Previews exact calculated supplier due date (e.g. "Due on: 08 Sep 2026") **before** save.
> - **Audience-Specific Dispatch Share** (`components/operations/DispatchShareModal.tsx` & `GET /api/dispatch/:id/share-text`):
>   - **Guest Copy**: Pickup point/time, vehicle number, driver contact (**zero supplier cost leakage**).
>   - **Driver Copy**: Passenger name, contact, duty notes (**zero client selling price leakage**).
>   - **Provider Copy**: Service order confirmation reference.
> - **Operational Vouchers** (`POST /api/service-bookings/:id/generate-voucher` & `app/api/vouchers/[id]`):
>   - Hotel, Activity (QR code support), Transport, and Trip vouchers with signed non-public proxy endpoints and `is_edited_after_generation` audit tracking.

---

## 🔒 Privacy & Pricing Sanitization Matrix

| Audience | Vehicle & Driver Info | Passenger Contact | Supplier Cost Price | Client Selling Price |
|---|:---:|:---:|:---:|:---:|
| **Guest Tab** | ✅ Yes | N/A | 🚫 **Strictly Hidden** | ✅ Visible if requested |
| **Driver Tab** | ✅ Yes | ✅ Yes | 🚫 **Strictly Hidden** | 🚫 **Strictly Hidden** |
| **Provider Tab** | ✅ Yes | ✅ Yes | ✅ Internal Ref | 🚫 **Strictly Hidden** |

---

## ⚡ Vibe Coder Cheat Sheet

```bash
# 1. Run 500+ booking load test & dispatch privacy verification
npx tsx scripts/test-phase2-calendar-load-and-vouchers.ts

# 2. Typecheck & lint
npx tsc --noEmit
npm run lint

# 3. View Operations Calendar UI:
# -> Open http://localhost:3000/operations/calendar
# -> Toggle between "Hotel Check-In/Out Grid" and "Trips Timeline"
```
