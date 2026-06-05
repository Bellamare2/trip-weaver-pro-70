ALTER TABLE public.reservations
  ADD COLUMN status text NOT NULL DEFAULT 'Pre-Arrival';

ALTER TABLE public.guests
  ADD COLUMN guest_type text;

ALTER TABLE public.activities
  ALTER COLUMN guest_id DROP NOT NULL;