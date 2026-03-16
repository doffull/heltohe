
-- 1. Create audit log table for role changes
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by uuid,
  operation text NOT NULL,
  target_user_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role audit log"
  ON public.role_audit_log
  FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Trigger function to write audit log on user_roles changes
CREATE OR REPLACE FUNCTION public.audit_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_audit_log (changed_by, operation, target_user_id, role)
    VALUES (auth.uid(), 'DELETE', OLD.user_id, OLD.role::text);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (changed_by, operation, target_user_id, role)
    VALUES (auth.uid(), 'INSERT', NEW.user_id, NEW.role::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.role_audit_log (changed_by, operation, target_user_id, role)
    VALUES (auth.uid(), 'UPDATE', NEW.user_id, NEW.role::text);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. Attach trigger to user_roles
DROP TRIGGER IF EXISTS trg_audit_role_change ON public.user_roles;
CREATE TRIGGER trg_audit_role_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_change();
