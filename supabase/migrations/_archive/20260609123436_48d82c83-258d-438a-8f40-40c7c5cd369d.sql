
-- Restrictive deny on direct INSERT into orders; all orders must go through validate_and_create_order RPC (SECURITY DEFINER bypasses RLS)
CREATE POLICY "deny_direct_order_insert"
ON public.orders
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Allow newsletter subscribers to unsubscribe themselves (match by email in their JWT)
CREATE POLICY "Subscribers can unsubscribe themselves"
ON public.newsletters
FOR UPDATE
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt()->>'email','')))
WITH CHECK (lower(email) = lower(coalesce(auth.jwt()->>'email','')));
