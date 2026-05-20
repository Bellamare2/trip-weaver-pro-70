
-- Expand properties table
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS community text,
  ADD COLUMN IF NOT EXISTS gps text,
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS owner_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS wifi_ssid text,
  ADD COLUMN IF NOT EXISTS wifi_password text,
  ADD COLUMN IF NOT EXISTS gate_codes text,
  ADD COLUMN IF NOT EXISTS alarm_code text,
  ADD COLUMN IF NOT EXISTS alarm_company text,
  ADD COLUMN IF NOT EXISTS utility_providers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS insurance jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS property_tax jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS floor_plan_url text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Vendors
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  contact_name text,
  phone text,
  email text,
  insurance_status text NOT NULL DEFAULT 'Unknown',
  insurance_expires_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public vendors all" ON public.vendors FOR ALL USING (true) WITH CHECK (true);

-- Property service providers (link table)
CREATE TABLE IF NOT EXISTS public.property_service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_service_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public psp all" ON public.property_service_providers FOR ALL USING (true) WITH CHECK (true);

-- Property documents
CREATE TABLE IF NOT EXISTS public.property_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'Other',
  name text NOT NULL,
  file_url text,
  expires_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public pdoc all" ON public.property_documents FOR ALL USING (true) WITH CHECK (true);

-- Inspections
CREATE TABLE IF NOT EXISTS public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  inspector_name text,
  type text NOT NULL DEFAULT 'Weekly',
  date date NOT NULL DEFAULT CURRENT_DATE,
  overall_status text NOT NULL DEFAULT 'Good',
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insp all" ON public.inspections FOR ALL USING (true) WITH CHECK (true);

-- Inspection findings
CREATE TABLE IF NOT EXISTS public.inspection_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'Low',
  status text NOT NULL DEFAULT 'Open',
  photos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inspection_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public ifind all" ON public.inspection_findings FOR ALL USING (true) WITH CHECK (true);

-- Maintenance tickets
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Open',
  priority text NOT NULL DEFAULT 'Normal',
  cost_estimate numeric,
  invoice_url text,
  owner_approval_status text NOT NULL DEFAULT 'Not Required',
  photos text[] NOT NULL DEFAULT '{}',
  scheduled_for date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public mt all" ON public.maintenance_tickets FOR ALL USING (true) WITH CHECK (true);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'Other',
  amount_usd numeric NOT NULL DEFAULT 0,
  description text,
  invoice_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public exp all" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  make text,
  model text,
  year int,
  vin text,
  insurance_expires_at date,
  registration_expires_at date,
  last_inspection_at date,
  battery_status text,
  fuel_level text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public veh all" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

-- Arrival/Departure checklists
CREATE TABLE IF NOT EXISTS public.stay_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'Arrival',
  scheduled_date date,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stay_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public sc all" ON public.stay_checklists FOR ALL USING (true) WITH CHECK (true);

-- touch_updated_at triggers
CREATE TRIGGER trg_properties_updated BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_inspections_updated BEFORE UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_mt_updated BEFORE UPDATE ON public.maintenance_tickets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_sc_updated BEFORE UPDATE ON public.stay_checklists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_mt_property ON public.maintenance_tickets(property_id);
CREATE INDEX IF NOT EXISTS idx_mt_status ON public.maintenance_tickets(status);
CREATE INDEX IF NOT EXISTS idx_insp_property ON public.inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_exp_property ON public.expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_exp_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_veh_property ON public.vehicles(property_id);
