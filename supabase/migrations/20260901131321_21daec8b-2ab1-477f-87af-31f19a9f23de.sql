ALTER TABLE public.newsletters
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirm_token UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS newsletters_confirm_token_idx ON public.newsletters(confirm_token);
CREATE UNIQUE INDEX IF NOT EXISTS newsletters_unsubscribe_token_idx ON public.newsletters(unsubscribe_token);

CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  preheader TEXT,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  unsubscribed_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_campaigns TO authenticated;
GRANT ALL ON public.newsletter_campaigns TO service_role;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage newsletter campaigns"
ON public.newsletter_campaigns FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.newsletter_campaign_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_campaign_sends_campaign_idx ON public.newsletter_campaign_sends(campaign_id);

GRANT SELECT ON public.newsletter_campaign_sends TO authenticated;
GRANT ALL ON public.newsletter_campaign_sends TO service_role;
ALTER TABLE public.newsletter_campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read newsletter campaign sends"
ON public.newsletter_campaign_sends FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_newsletter_campaigns_updated_at
BEFORE UPDATE ON public.newsletter_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.checkout_config
  ADD COLUMN IF NOT EXISTS auto_colissimo_label BOOLEAN NOT NULL DEFAULT false;