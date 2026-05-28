
CREATE TABLE public.page_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('product','category')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  layout JSONB NOT NULL DEFAULT '{"grid":{"cols":12,"gap":16},"blocks":[]}'::jsonb,
  preview_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.page_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_templates TO authenticated;
GRANT ALL ON public.page_templates TO service_role;

ALTER TABLE public.page_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read page templates"
  ON public.page_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins manage page templates"
  ON public.page_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_page_templates_updated_at
  BEFORE UPDATE ON public.page_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Only one default per type
CREATE UNIQUE INDEX page_templates_default_per_type
  ON public.page_templates(type) WHERE is_default = true;

-- Optional override per product/category
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.page_templates(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.page_templates(id) ON DELETE SET NULL;
