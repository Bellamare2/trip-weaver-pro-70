-- Add guest_type to guests
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS guest_type text;
-- Valid values: 'Owner' | 'Friend of Owner' | 'Rental' | NULL (unknown)
