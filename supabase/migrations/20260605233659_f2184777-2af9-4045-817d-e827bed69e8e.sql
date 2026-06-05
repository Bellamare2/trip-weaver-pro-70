CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  property text,
  check_in date,
  check_out date,
  notes text,
  itinerary_intro text NOT NULL DEFAULT 'Please find below your personalized itinerary for your upcoming stay at Bellamare.',
  itinerary_closing text NOT NULL DEFAULT E'If there is anything we can do to make your stay more memorable, please do not hesitate to contact us.\n\nWarm regards,\nBellamare Concierge Team',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reservations_guest_idx ON public.reservations(guest_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth all" ON public.reservations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER reservations_touch_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER reservations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

ALTER TABLE public.activities
  ADD COLUMN reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL;

CREATE INDEX activities_reservation_idx ON public.activities(reservation_id);