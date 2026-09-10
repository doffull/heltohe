
-- 1) roulette_config: remove broad public SELECT (leaks notify_admin_email). Public uses roulette_config_public view.
DROP POLICY IF EXISTS "Public can read non-sensitive roulette config" ON public.roulette_config;
CREATE POLICY "Restrict roulette_config reads to admins"
  ON public.roulette_config AS RESTRICTIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Deny anon reads on roulette_config"
  ON public.roulette_config AS RESTRICTIVE FOR SELECT TO anon
  USING (false);

-- 2) roulette_segments: add restrictive admin-only read for authenticated, deny anon. Public uses roulette_segments_public view.
CREATE POLICY "Restrict roulette_segments reads to admins"
  ON public.roulette_segments AS RESTRICTIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Deny anon reads on roulette_segments"
  ON public.roulette_segments AS RESTRICTIVE FOR SELECT TO anon
  USING (false);

-- 3) bot_config: restrict reads to admins. Public chatbot uses bot_config_public view.
CREATE POLICY "Restrict bot_config reads to admins"
  ON public.bot_config AS RESTRICTIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Deny anon reads on bot_config"
  ON public.bot_config AS RESTRICTIVE FOR SELECT TO anon
  USING (false);

-- 4) visitor_sessions: extend update deny to anon (defense in depth)
DROP POLICY IF EXISTS "Deny visitor session updates" ON public.visitor_sessions;
CREATE POLICY "Deny visitor session updates"
  ON public.visitor_sessions AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);
