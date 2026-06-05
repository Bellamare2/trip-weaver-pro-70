-- ── Reservations ─────────────────────────────────────────────────────────────
-- A reservation links a guest to a stay (property + optional dates).
-- Activities can be linked to a reservation via reservation_id.
-- The itinerary intro/closing are stored here so each stay can have its own.

CREATE TABLE IF NOT EXISTS public.reservations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id         uuid        NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  property         text,
  check_in         date,
  check_out        date,
  notes            text,
  itinerary_intro  text        NOT NULL DEFAULT 'Please find below your personalized itinerary for your upcoming stay at Bellamare.',
  itinerary_closing text       NOT NULL DEFAULT 'If there is anything we can do to make your stay more memorable, please do not hesitate to contact us.\n\nWarm regards,\nBellamare Concierge Team',
  created_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_guest ON public.reservations(guest_id);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reservations all" ON public.reservations FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER trg_reservations_updated
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Audit
CREATE TRIGGER trg_reservations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

-- Link activities to reservations (optional)
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activities_reservation ON public.activities(reservation_id);
