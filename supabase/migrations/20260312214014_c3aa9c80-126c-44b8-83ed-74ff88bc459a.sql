
CREATE TABLE public.colissimo_bordereaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  bordereau_date date NOT NULL,
  package_count int NOT NULL DEFAULT 0,
  tracking_numbers jsonb DEFAULT '[]'::jsonb,
  pdf_base64 text
);

ALTER TABLE public.colissimo_bordereaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access bordereaux"
  ON public.colissimo_bordereaux
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
