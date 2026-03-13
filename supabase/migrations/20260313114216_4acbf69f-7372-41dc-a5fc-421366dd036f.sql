
-- Fix: Replace overly permissive WITH CHECK (true) on chat_logs INSERT
-- The chatbot needs to insert logs from any visitor; we tighten it to require
-- that session_id is not null (every real chatbot session has one)
DROP POLICY IF EXISTS "Anyone can insert chat logs" ON public.chat_logs;

CREATE POLICY "Anyone can insert chat logs"
  ON public.chat_logs
  FOR INSERT
  WITH CHECK (session_id IS NOT NULL AND length(user_message) <= 2000);
