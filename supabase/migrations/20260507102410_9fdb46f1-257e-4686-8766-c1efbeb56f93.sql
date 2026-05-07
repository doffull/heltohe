
CREATE TABLE IF NOT EXISTS public.newsletter_popups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Rejoignez la newsletter',
  subtitle TEXT DEFAULT '',
  cta_label TEXT NOT NULL DEFAULT 'S''inscrire',
  image_url TEXT,
  display_trigger TEXT NOT NULL DEFAULT 'delay',
  delay_seconds INTEGER NOT NULL DEFAULT 5,
  frequency_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  bg_color TEXT DEFAULT '#000000',
  text_color TEXT DEFAULT '#ffffff',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active popups"
ON public.newsletter_popups FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage popups"
ON public.newsletter_popups FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER newsletter_popups_updated_at
BEFORE UPDATE ON public.newsletter_popups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add sidebar newsletter toggle to design_settings
ALTER TABLE public.design_settings
  ADD COLUMN IF NOT EXISTS show_sidebar_newsletter BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sidebar_newsletter_title TEXT DEFAULT 'Newsletter',
  ADD COLUMN IF NOT EXISTS sidebar_newsletter_cta TEXT DEFAULT 'Je m''inscris',
  ADD COLUMN IF NOT EXISTS voice_command_enabled BOOLEAN DEFAULT true;
