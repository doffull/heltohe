
-- Newsletters: only admins can SELECT
CREATE POLICY "Restrict newsletter reads to admins"
  ON public.newsletters AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Messages (contact form): only admins can SELECT
CREATE POLICY "Restrict message reads to admins"
  ON public.messages AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Chat logs: only admins can SELECT
CREATE POLICY "Restrict chat log reads to admins"
  ON public.chat_logs AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Stock history: only admins / stock managers
CREATE POLICY "Restrict stock history reads to staff"
  ON public.stock_history AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'stock_manager'::app_role)
  );

-- Stock transfers: only admins / stock managers
CREATE POLICY "Restrict stock transfer reads to staff"
  ON public.stock_transfers AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'stock_manager'::app_role)
  );

-- Order preparations: only admins, stock managers, and the assigned preparator
CREATE POLICY "Restrict preparation reads to staff or assignee"
  ON public.order_preparations AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'stock_manager'::app_role)
    OR (assigned_to = auth.uid() AND public.has_role(auth.uid(), 'preparator'::app_role))
  );

-- Orders: prevent leakage of guest orders (user_id IS NULL) to non-admins
CREATE POLICY "Block non-admin access to guest orders"
  ON public.orders AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id IS NOT NULL
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Recreate views with security_invoker so the caller's RLS applies.
ALTER VIEW public.design_settings_public SET (security_invoker = true);
ALTER VIEW public.user_roles_with_email SET (security_invoker = true);
