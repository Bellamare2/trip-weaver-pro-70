ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS adults int,
  ADD COLUMN IF NOT EXISTS kids int;
