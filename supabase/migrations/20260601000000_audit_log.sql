-- ── Audit log ────────────────────────────────────────────────────────────────
-- Tracks every INSERT / UPDATE / DELETE on key tables.
-- created_by / updated_by columns are added to each tracked table so the
-- current user is visible at a glance without querying audit_logs.

-- 1. audit_logs table ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    text        NOT NULL,
  record_id     uuid        NOT NULL,
  action        text        NOT NULL,          -- 'INSERT' | 'UPDATE' | 'DELETE'
  changed_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name text,                        -- denormalized display name
  changes       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_record    ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON public.audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Anyone can read the log (auth will lock this down later)
CREATE POLICY "public audit_logs select" ON public.audit_logs FOR SELECT USING (true);
-- Inserts come only from the SECURITY DEFINER trigger function below
CREATE POLICY "public audit_logs insert" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- 2. created_by / updated_by columns on key tables ----------------------------
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.stay_checklists
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Trigger function ---------------------------------------------------------
-- Runs AFTER INSERT/UPDATE/DELETE and writes one row to audit_logs.
-- Also auto-fills updated_by on the changed record.
CREATE OR REPLACE FUNCTION public.log_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid;
  v_user_name text;
  v_changes   jsonb;
  v_record_id uuid;
BEGIN
  -- Who did this?
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT display_name INTO v_user_name
    FROM public.profiles
    WHERE id = v_user_id;
  END IF;

  -- Build the change payload
  IF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_changes   := jsonb_build_object('after', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    -- Only store fields that actually changed
    SELECT jsonb_object_agg(key, jsonb_build_object('from', old_val, 'to', new_val))
    INTO v_changes
    FROM (
      SELECT key,
             (to_jsonb(OLD) -> key) AS old_val,
             (to_jsonb(NEW) -> key) AS new_val
      FROM   jsonb_object_keys(to_jsonb(NEW)) AS t(key)
      WHERE  (to_jsonb(OLD) -> key) IS DISTINCT FROM (to_jsonb(NEW) -> key)
        AND  key NOT IN ('updated_at', 'updated_by')   -- skip noise
    ) diffs;
    IF v_changes IS NULL THEN v_changes := '{}'::jsonb; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_changes   := jsonb_build_object('before', to_jsonb(OLD));
  END IF;

  INSERT INTO public.audit_logs
    (table_name, record_id, action, changed_by, changed_by_name, changes)
  VALUES
    (TG_TABLE_NAME, v_record_id, TG_OP, v_user_id, v_user_name, v_changes);

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.log_table_change() FROM public, anon, authenticated;

-- 4. Auto-fill updated_by on every UPDATE ------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_by()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

-- 5. Attach triggers ----------------------------------------------------------
-- activities
CREATE TRIGGER trg_activities_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

CREATE TRIGGER trg_activities_updated_by
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_by();

-- guests
CREATE TRIGGER trg_guests_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

CREATE TRIGGER trg_guests_updated_by
  BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_by();

-- stay_checklists
CREATE TRIGGER trg_stay_checklists_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.stay_checklists
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

CREATE TRIGGER trg_stay_checklists_updated_by
  BEFORE UPDATE ON public.stay_checklists
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_by();

-- maintenance_tickets
CREATE TRIGGER trg_maintenance_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

CREATE TRIGGER trg_maintenance_updated_by
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_by();

-- expenses (no updated_by — expenses are immutable once created)
CREATE TRIGGER trg_expenses_audit
  AFTER INSERT OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

-- inspections
CREATE TRIGGER trg_inspections_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

CREATE TRIGGER trg_inspections_updated_by
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_by();
