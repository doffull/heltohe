
-- 1. Fix Security Definer View
ALTER VIEW public.design_settings_public SET (security_invoker = true);

-- 2. Lock down visitor_sessions UPDATE
DROP POLICY IF EXISTS "Anyone can update own session by session_id" ON public.visitor_sessions;

CREATE OR REPLACE FUNCTION public.track_session_heartbeat(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) < 8 THEN RETURN; END IF;
  UPDATE public.visitor_sessions
     SET last_seen_at = now()
   WHERE session_id = p_session_id;
END;
$$;
REVOKE ALL ON FUNCTION public.track_session_heartbeat(text) FROM public;
GRANT EXECUTE ON FUNCTION public.track_session_heartbeat(text) TO anon, authenticated;

-- 3. Lock down newsletter_popup_views UPDATE
DROP POLICY IF EXISTS "Anyone can mark conversion by session" ON public.newsletter_popup_views;

CREATE OR REPLACE FUNCTION public.mark_popup_converted(p_popup_id uuid, p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_popup_id IS NULL OR p_session_id IS NULL OR length(p_session_id) < 8 THEN RETURN; END IF;
  UPDATE public.newsletter_popup_views
     SET converted = true, converted_at = now()
   WHERE popup_id = p_popup_id AND session_id = p_session_id AND converted IS NOT TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_popup_converted(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_popup_converted(uuid, text) TO anon, authenticated;

-- 4. Remove sensitive tracking tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.visitor_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.page_views;
ALTER PUBLICATION supabase_realtime DROP TABLE public.click_events;
