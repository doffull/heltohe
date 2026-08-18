ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS label_url text,
  ADD COLUMN IF NOT EXISTS label_path text,
  ADD COLUMN IF NOT EXISTS label_generated_at timestamptz;

CREATE POLICY "Admins can read labels"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'labels'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'preparator'))
);

CREATE POLICY "Admins can write labels"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'labels' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete labels"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'labels' AND public.has_role(auth.uid(), 'admin'));