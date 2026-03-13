
-- 1. Add mannequin_hotspots column to design_settings
ALTER TABLE public.design_settings
  ADD COLUMN IF NOT EXISTS mannequin_hotspots jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Create product_looks table
CREATE TABLE IF NOT EXISTS public.product_looks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_image text,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_looks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product looks"
  ON public.product_looks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active product looks"
  ON public.product_looks FOR SELECT
  USING (is_active = true);

-- 3. Create product_styles table
CREATE TABLE IF NOT EXISTS public.product_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image text,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product styles"
  ON public.product_styles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active product styles"
  ON public.product_styles FOR SELECT
  USING (is_active = true);

-- Triggers for updated_at
CREATE TRIGGER update_product_looks_updated_at
  BEFORE UPDATE ON public.product_looks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_styles_updated_at
  BEFORE UPDATE ON public.product_styles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
