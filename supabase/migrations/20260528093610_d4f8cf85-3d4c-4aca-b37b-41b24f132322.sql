CREATE TABLE public.boutiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'France',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  image TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.boutiques TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boutiques TO authenticated;
GRANT ALL ON public.boutiques TO service_role;

ALTER TABLE public.boutiques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Boutiques are publicly readable"
  ON public.boutiques FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert boutiques"
  ON public.boutiques FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update boutiques"
  ON public.boutiques FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete boutiques"
  ON public.boutiques FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_boutiques_updated_at
  BEFORE UPDATE ON public.boutiques
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_boutiques_active_sort ON public.boutiques(is_active, sort_order);