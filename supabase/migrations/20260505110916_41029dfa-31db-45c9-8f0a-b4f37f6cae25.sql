
-- Trigger d'audit sur user_roles
DROP TRIGGER IF EXISTS user_roles_audit ON public.user_roles;
CREATE TRIGGER user_roles_audit
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_role_change();

-- Vue admin pour lister rôles + emails (security_invoker pour respecter RLS du caller)
CREATE OR REPLACE VIEW public.user_roles_with_email
WITH (security_invoker=on) AS
SELECT
  ur.id,
  ur.user_id,
  ur.role,
  ur.created_at,
  COALESCE(c.email, au.email) AS email,
  c.first_name,
  c.last_name
FROM public.user_roles ur
LEFT JOIN public.customers c ON c.user_id = ur.user_id
LEFT JOIN auth.users au ON au.id = ur.user_id;

GRANT SELECT ON public.user_roles_with_email TO authenticated;
