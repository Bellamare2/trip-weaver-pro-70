DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own roles read" ON public.user_roles;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('staff','admin'))
$$;

-- Existing users are the current staff team
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'staff'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['activities','expenses','guests','inspection_findings','inspections','maintenance_tickets','properties','property_documents','property_service_providers','reservations','stay_checklists','vehicles','vendors'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "staff all" ON public.%I FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "auth read audit" ON public.audit_logs;
CREATE POLICY "staff read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));