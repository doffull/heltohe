DROP POLICY IF EXISTS role_permissions_select_authenticated ON public.role_permissions;

CREATE POLICY role_permissions_select_admin_or_own
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), role)
);