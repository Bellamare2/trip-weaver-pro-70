ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS adults int;

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS kids int;