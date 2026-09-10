CREATE POLICY "Anyone can update their session"
  ON public.visitor_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

GRANT UPDATE ON public.visitor_sessions TO anon, authenticated;