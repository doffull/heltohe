CREATE TABLE IF NOT EXISTS public.popup_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'promo',
  is_active boolean NOT NULL DEFAULT false,
  format text NOT NULL DEFAULT 'square',
  layers jsonb NOT NULL DEFAULT '[]'::jsonb,
  background jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_trigger text NOT NULL DEFAULT 'delay',
  delay_seconds integer NOT NULL DEFAULT 5,
  scroll_percent integer NOT NULL DEFAULT 50,
  idle_seconds integer NOT NULL DEFAULT 30,
  visit_count integer NOT NULL DEFAULT 1,
  frequency_days integer NOT NULL DEFAULT 7,
  max_views integer NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 0,
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.popup_campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.popup_campaigns TO authenticated;
GRANT ALL ON public.popup_campaigns TO service_role;
ALTER TABLE public.popup_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "popup_campaigns_public_read_active" ON public.popup_campaigns;
CREATE POLICY "popup_campaigns_public_read_active" ON public.popup_campaigns
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "popup_campaigns_admin_all" ON public.popup_campaigns;
CREATE POLICY "popup_campaigns_admin_all" ON public.popup_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS popup_campaigns_updated_at ON public.popup_campaigns;
CREATE TRIGGER popup_campaigns_updated_at BEFORE UPDATE ON public.popup_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.popup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.popup_campaigns(id) ON DELETE CASCADE,
  event text NOT NULL,
  session_id text,
  url text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS popup_events_campaign_idx ON public.popup_events (campaign_id, event);

GRANT INSERT ON public.popup_events TO anon;
GRANT SELECT, INSERT ON public.popup_events TO authenticated;
GRANT ALL ON public.popup_events TO service_role;
ALTER TABLE public.popup_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "popup_events_public_insert" ON public.popup_events;
CREATE POLICY "popup_events_public_insert" ON public.popup_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (event IN ('view','click','dismiss','convert'));

DROP POLICY IF EXISTS "popup_events_admin_read" ON public.popup_events;
CREATE POLICY "popup_events_admin_read" ON public.popup_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.popup_campaigns (name, type, is_active, format, layers, background, display_trigger, delay_seconds, frequency_days, priority)
SELECT
  np.name,
  'newsletter',
  np.is_active,
  'square',
  jsonb_build_array(
    jsonb_build_object('id', 'title', 'kind', 'text', 'text', np.title, 'x', 8, 'y', 42, 'w', 84, 'fontSize', 26, 'fontWeight', 700, 'color', COALESCE(np.text_color,'#ffffff'), 'align', 'center', 'uppercase', true, 'animation', 'fade'),
    jsonb_build_object('id', 'subtitle', 'kind', 'text', 'text', COALESCE(np.subtitle,''), 'x', 8, 'y', 56, 'w', 84, 'fontSize', 14, 'fontWeight', 400, 'color', COALESCE(np.text_color,'#ffffff'), 'align', 'center', 'animation', 'fade', 'delay', 0.15),
    jsonb_build_object('id', 'email', 'kind', 'email', 'x', 12, 'y', 68, 'w', 76, 'placeholder', 'email@exemple.com', 'ctaLabel', COALESCE(np.cta_label, 'Je m''inscris'), 'color', COALESCE(np.text_color,'#ffffff'))
  ),
  jsonb_build_object('color', COALESCE(np.bg_color,'#000000'), 'image', np.image_url),
  np.display_trigger,
  COALESCE(np.delay_seconds, 5),
  COALESCE(np.frequency_days, 7),
  COALESCE(np.sort_order, 0)
FROM public.newsletter_popups np
WHERE NOT EXISTS (SELECT 1 FROM public.popup_campaigns pc WHERE pc.name = np.name);