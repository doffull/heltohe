ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS orders_is_draft_idx ON public.orders (is_draft);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER,
  ADD COLUMN IF NOT EXISTS dim_length_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS dim_width_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS dim_height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS colissimo_product_code TEXT;

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  html_body TEXT NOT NULL DEFAULT '',
  text_body TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_admin_all"
  ON public.email_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

UPDATE public.orders
   SET abandoned_at = now()
 WHERE abandoned_at IS NULL
   AND lower(coalesce(payment_status, '')) <> 'paid';