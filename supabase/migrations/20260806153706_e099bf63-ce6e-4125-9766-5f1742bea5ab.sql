CREATE TABLE public.mannequins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'unisexe',
  age_range TEXT NOT NULL DEFAULT 'adulte',
  skin_tone TEXT NOT NULL DEFAULT 'medium',
  morphology TEXT NOT NULL DEFAULT 'regular',
  height_cm INTEGER,
  fit_notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mannequins TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mannequins TO authenticated;
GRANT ALL ON public.mannequins TO service_role;

ALTER TABLE public.mannequins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active mannequins"
  ON public.mannequins FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert mannequins"
  ON public.mannequins FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update mannequins"
  ON public.mannequins FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete mannequins"
  ON public.mannequins FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_mannequins_updated_at
  BEFORE UPDATE ON public.mannequins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tryon_looks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mannequin_id UUID REFERENCES public.mannequins(id) ON DELETE SET NULL,
  base_product_id UUID,
  title TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tryon_looks TO authenticated;
GRANT ALL ON public.tryon_looks TO service_role;

ALTER TABLE public.tryon_looks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own looks"
  ON public.tryon_looks FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_tryon_looks_updated_at
  BEFORE UPDATE ON public.tryon_looks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tryon_looks_user ON public.tryon_looks(user_id, created_at DESC);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tryon_mode TEXT NOT NULL DEFAULT 'both';