-- Add adults and kids columns to reservations (they were missing from initial schema)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS adults int,
  ADD COLUMN IF NOT EXISTS kids int;
