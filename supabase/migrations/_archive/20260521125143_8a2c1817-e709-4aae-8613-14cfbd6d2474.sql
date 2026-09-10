CREATE TABLE IF NOT EXISTS public.admin_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  route text,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_access_log_user_idx ON public.admin_access_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_access_log_created_idx ON public.admin_access_log(created_at DESC);

ALTER TABLE public.admin_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the log
DROP POLICY IF EXISTS admin_access_log_select ON public.admin_access_log;
CREATE POLICY admin_access_log_select ON public.admin_access_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Any authenticated user with admin-panel access can insert their own access
DROP POLICY IF EXISTS admin_access_log_insert ON public.admin_access_log;
CREATE POLICY admin_access_log_insert ON public.admin_access_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'stock_manager')
      OR public.has_role(auth.uid(), 'preparator')
    )
  );

-- No update/delete from clients (admin can use migrations for purge)
