
-- Replace permissive public policies with authenticated-only policies
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['activities','expenses','guests','inspection_findings','inspections','maintenance_tickets','properties','property_documents','property_service_providers','stay_checklists','vehicles','vendors'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'public ' || split_part(t,'_',1) || ' all', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "public activities all" ON public.activities;
DROP POLICY IF EXISTS "public exp all" ON public.expenses;
DROP POLICY IF EXISTS "public guests all" ON public.guests;
DROP POLICY IF EXISTS "public ifind all" ON public.inspection_findings;
DROP POLICY IF EXISTS "public insp all" ON public.inspections;
DROP POLICY IF EXISTS "public mt all" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "public properties all" ON public.properties;
DROP POLICY IF EXISTS "public pdoc all" ON public.property_documents;
DROP POLICY IF EXISTS "public psp all" ON public.property_service_providers;
DROP POLICY IF EXISTS "public sc all" ON public.stay_checklists;
DROP POLICY IF EXISTS "public veh all" ON public.vehicles;
DROP POLICY IF EXISTS "public vendors all" ON public.vendors;
DROP POLICY IF EXISTS "public audit_logs select" ON public.audit_logs;
DROP POLICY IF EXISTS "public audit_logs insert" ON public.audit_logs;

-- Authenticated-only ALL policies on data tables
CREATE POLICY "auth all" ON public.activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON public.guests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON public.inspection_findings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON public.inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON public.maintenance_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON public.properties FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON public.property_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON public.property_service_providers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON public.stay_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON public.vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- audit_logs: authenticated can read; inserts only via SECURITY DEFINER trigger (no policy = no direct insert path for clients)
CREATE POLICY "auth read audit" ON public.audit_logs FOR SELECT TO authenticated USING (true);

-- Revoke anon grants on these tables
REVOKE ALL ON public.activities, public.expenses, public.guests, public.inspection_findings,
  public.inspections, public.maintenance_tickets, public.properties, public.property_documents,
  public.property_service_providers, public.stay_checklists, public.vehicles, public.vendors,
  public.audit_logs FROM anon;
