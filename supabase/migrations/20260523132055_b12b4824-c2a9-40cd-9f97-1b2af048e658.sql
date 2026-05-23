-- 1. Remove blanket public SELECT on design_settings base table.
-- Frontend already reads via the design_settings_public view; admins keep full access.
DROP POLICY IF EXISTS "Public can read design_settings safe columns" ON public.design_settings;

-- 2. Remove the overly permissive UPDATE policy on visitor_sessions.
-- Heartbeats go through the SECURITY DEFINER RPC track_session_heartbeat,
-- so anonymous clients no longer need direct UPDATE rights.
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.visitor_sessions;