CREATE OR REPLACE FUNCTION public.touch_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$function$;