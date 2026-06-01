-- Remove redundant permissive policy; restrictive admin-only policy remains
DROP POLICY IF EXISTS "Authenticated can read design settings" ON public.design_settings;

-- Defense-in-depth: explicit anon deny on inventory
CREATE POLICY "Deny anon reads on inventory"
ON public.inventory
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);