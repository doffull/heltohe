CREATE POLICY "Deny anon access to stock_levels"
ON public.stock_levels
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);