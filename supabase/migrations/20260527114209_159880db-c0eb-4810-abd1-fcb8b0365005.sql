
-- Block anonymous reads on base design_settings table.
-- Public surface reads must go through public.design_settings_public view.
DROP POLICY IF EXISTS "Public can read design settings" ON public.design_settings;

CREATE POLICY "Authenticated can read design settings"
ON public.design_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Deny anon reads on design_settings"
ON public.design_settings
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);
