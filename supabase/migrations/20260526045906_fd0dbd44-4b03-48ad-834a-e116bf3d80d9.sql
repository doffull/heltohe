
-- 1. design_settings: restrict SELECT to admins only (public reads must use design_settings_public view)
CREATE POLICY "Restrict design_settings reads to admins"
ON public.design_settings
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. notification_config: restrict SELECT to admins only
CREATE POLICY "Restrict notification_config reads to admins"
ON public.notification_config
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. roulette_spins: restrict SELECT to owner or admin (protects guest rows with emails)
CREATE POLICY "Restrict roulette_spins reads to owner or admin"
ON public.roulette_spins
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Also block anon entirely from reading guest spins
CREATE POLICY "Deny anon read on roulette_spins"
ON public.roulette_spins
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- 4. visitor_sessions: replace overly permissive INSERT with validated check
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.visitor_sessions;
CREATE POLICY "Anyone can insert sessions"
ON public.visitor_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (session_id IS NOT NULL AND length(session_id) >= 8 AND length(session_id) <= 200);
