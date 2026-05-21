CREATE POLICY "Anyone can update sessions"
ON public.visitor_sessions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (session_id IS NOT NULL AND length(session_id) >= 8);