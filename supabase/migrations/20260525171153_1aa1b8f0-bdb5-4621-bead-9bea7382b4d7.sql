
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'Other',
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS confirmed_with text,
  ADD COLUMN IF NOT EXISTS roll_over boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS repeat_pattern text,
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_activities_date ON public.activities(date);
CREATE INDEX IF NOT EXISTS idx_activities_guest_id ON public.activities(guest_id);
