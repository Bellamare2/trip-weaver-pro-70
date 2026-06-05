-- Add status to reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Pre-Arrival';

-- Valid values: 'Pre-Arrival' | 'In House' | 'Out'
