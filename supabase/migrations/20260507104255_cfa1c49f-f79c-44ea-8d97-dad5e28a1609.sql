
-- Newsletter tracking
ALTER TABLE public.newsletters
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS popup_id uuid,
  ADD COLUMN IF NOT EXISTS referrer_path text;

CREATE TABLE IF NOT EXISTS public.newsletter_popup_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id uuid NOT NULL,
  session_id text,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_nlpv_popup ON public.newsletter_popup_views(popup_id);
CREATE INDEX IF NOT EXISTS idx_nlpv_session ON public.newsletter_popup_views(session_id);

ALTER TABLE public.newsletter_popup_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record popup view"
  ON public.newsletter_popup_views FOR INSERT
  WITH CHECK (popup_id IS NOT NULL);

CREATE POLICY "Anyone can mark conversion by session"
  ON public.newsletter_popup_views FOR UPDATE
  USING (session_id IS NOT NULL);

CREATE POLICY "Admins can read popup views"
  ON public.newsletter_popup_views FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Roulette config: notifications & preferences
ALTER TABLE public.roulette_config
  ADD COLUMN IF NOT EXISTS notify_admin_on_win boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_admin_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS auto_open_on_landing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_open_delay_ms integer NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS show_after_dismiss_hours integer NOT NULL DEFAULT 24;

-- Design settings: voice onboarding hint
ALTER TABLE public.design_settings
  ADD COLUMN IF NOT EXISTS voice_onboarding_hint boolean NOT NULL DEFAULT true;

-- Newsletter stats RPC
CREATE OR REPLACE FUNCTION public.get_newsletter_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_recent integer;
  v_unsub integer;
  v_by_source jsonb;
  v_top_popup jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT count(*) INTO v_total FROM public.newsletters WHERE is_subscribed = true;
  SELECT count(*) INTO v_recent FROM public.newsletters WHERE subscribed_at > now() - interval '7 days';
  SELECT count(*) INTO v_unsub FROM public.newsletters WHERE is_subscribed = false;
  SELECT coalesce(jsonb_object_agg(coalesce(source,'unknown'), c), '{}'::jsonb)
    INTO v_by_source
    FROM (SELECT source, count(*) c FROM public.newsletters GROUP BY source) s;
  SELECT to_jsonb(t) INTO v_top_popup FROM (
    SELECT p.id, p.name,
      (SELECT count(*) FROM public.newsletter_popup_views v WHERE v.popup_id = p.id) views,
      (SELECT count(*) FROM public.newsletter_popup_views v WHERE v.popup_id = p.id AND v.converted) conversions
    FROM public.newsletter_popups p
    ORDER BY conversions DESC NULLS LAST
    LIMIT 1
  ) t;
  RETURN jsonb_build_object(
    'totalSubscribers', v_total,
    'last7Days', v_recent,
    'unsubscribed', v_unsub,
    'bySource', v_by_source,
    'topPopup', v_top_popup
  );
END;
$$;
