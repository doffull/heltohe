CREATE TABLE public.seo_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_url text NOT NULL,
  old_path text NOT NULL,
  new_path text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'review',
  source text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_redirects_old_path_key UNIQUE (old_path)
);

GRANT SELECT ON public.seo_redirects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_redirects TO authenticated;
GRANT ALL ON public.seo_redirects TO service_role;

ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Redirects are publicly readable"
ON public.seo_redirects FOR SELECT
USING (true);

CREATE POLICY "Admins can insert redirects"
ON public.seo_redirects FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update redirects"
ON public.seo_redirects FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete redirects"
ON public.seo_redirects FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_seo_redirects_updated_at
BEFORE UPDATE ON public.seo_redirects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();