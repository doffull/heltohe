-- Restore public read access on design_settings via the design_settings_public view.
-- The view has security_invoker=on, so anon/authenticated callers must have a SELECT
-- policy on the base table for their queries through the view to return rows.
-- The view intentionally excludes sensitive columns; sensitive config lives in admin_config.

CREATE POLICY "Public can read design settings"
ON public.design_settings
FOR SELECT
TO anon, authenticated
USING (true);