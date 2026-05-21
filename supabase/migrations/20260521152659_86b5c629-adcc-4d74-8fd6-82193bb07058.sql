ALTER TABLE public.design_settings
  ADD COLUMN IF NOT EXISTS home_custom_sections JSONB NOT NULL DEFAULT '[]'::jsonb;

DROP VIEW IF EXISTS public.design_settings_public;
CREATE VIEW public.design_settings_public AS
  SELECT * FROM public.design_settings;

GRANT SELECT ON public.design_settings_public TO anon, authenticated;