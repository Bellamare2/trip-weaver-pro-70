## Goal

Rework the Calendar/Itinerary experience to match the reference concierge app, with service-type-specific activity forms (transportation, restaurant, activities) and a day-view that allows inline editing.

## Changes

### 1. Database — extend `activities` table
Add columns to support service-specific fields (all nullable):
- `service_type` text — "Arrival Transportation" | "Departure Transportation" | "Private Transportation" | "Restaurant Reservation" | "Activity" | "Spa" | "Other"
- `assigned_to` text
- `internal_notes` text
- `details` jsonb — flexible store for type-specific fields (car_type, pickup, destination, flight_number, restaurant, party_size, kids, allergies, activity_type, vendor, public_or_private, etc.)
- `confirmed_with` text
- `repeat_pattern` text, `roll_over` boolean

Keep existing `category`, `vendor`, `location`, `price_usd`, `confirmation_number`, `notes`, `status`.

### 2. New `ActivityDialog` (rewrite)
- Top fields: Guest (search + Add Guest button), Service Type (dropdown), Date & Time.
- Dynamic sections based on Service Type:
  - **Transportation** (arrival/departure/private): car type, pickup, destination, flight/airline, tail #, adults/children, car seat, additional names, charge type, price.
  - **Restaurant**: restaurant, party size, kids, allergies, transportation type, reservation time, reservation/confirmation #.
  - **Activity**: type of activity, vendor, adults/children, public/private, meeting time/location, duration, payment method, price, confirmation.
  - **Other**: free fields.
- Common bottom: Special Info, Internal Notes, Assigned To, Status.

### 3. Calendar page rework
- Add prominent **+ Guest Request** and **+ Internal Request** buttons in header (both open dialog; internal flag stored).
- Mini-calendar grid: under each date number, show a small **red dot** only if that day has activities.
- Click a date → opens **Day View panel** (right Sheet or in-page) showing all activities for that day in chronological order.
- Day View: each activity is an inline-editable card (quick edit time/status), click to open full dialog. Add button to create new activity for that date.
- Keep Month/Week toggle.

### 4. Domain updates
Extend `src/lib/domain.ts` with `SERVICE_TYPES`, default field maps per service type, and helpers.

## Files

- `supabase/migrations/...` — add columns to `activities`
- `src/lib/domain.ts` — service types + per-type field configs
- `src/components/activity-dialog.tsx` — full rewrite with dynamic sections
- `src/components/day-activities-panel.tsx` — new chronological day view
- `src/routes/_authenticated/app.calendar.tsx` — header buttons, red-dot indicator, day-click opens panel
- `src/components/activity-card.tsx` — minor: surface service_type label

## Out of scope
- No new Add Guest mini-dialog from inside Activity dialog — the "Add Guest" button will link to the existing guests page in a new tab. (Can be upgraded later.)
- No SMS/print/copy actions on the dialog yet.
