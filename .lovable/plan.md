## Why preview is blank

The build is failing with TypeScript errors. The code references a `reservations` table and an `activities.reservation_id` column that do **not** exist in the database (and therefore are missing from the generated Supabase types). Files affected:

- `src/components/reservation-dialog.tsx` — inserts/updates `reservations`
- `src/components/itinerary-dialog.tsx` — reads activities by `reservation_id`, updates `reservations`
- `src/routes/_authenticated/app.guests.$guestId.tsx` — lists reservations for a guest
- `src/components/activity-dialog.tsx` — writes `reservation_id` on activities

Until the schema matches the code, the app cannot compile and the preview stays blank.

## Plan

1. Add a migration that creates the schema the code already expects:
   - `public.reservations` table with columns: `id uuid pk`, `guest_id uuid not null fk → guests(id) on delete cascade`, `property text`, `check_in date`, `check_out date`, `notes text`, `itinerary_intro text not null default '…'`, `itinerary_closing text not null default '…'`, `created_by uuid`, `created_at`, `updated_at` (with `updated_at` trigger like other tables).
   - Add `reservation_id uuid` (nullable) to `public.activities` with `fk → reservations(id) on delete set null` + index.
   - Standard grants: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated; GRANT ALL TO service_role;`
   - Enable RLS, add staff-only policy `FOR ALL TO authenticated USING (true) WITH CHECK (true)` (matches the existing operational-tables convention recorded in security memory).
   - Attach the existing `log_table_change()` audit trigger for consistency with other tables.

2. After the migration runs, Supabase regenerates `src/integrations/supabase/types.ts`, the TS errors clear, and the dev server serves the preview again.

No frontend code changes needed — the components are already written against this schema.
