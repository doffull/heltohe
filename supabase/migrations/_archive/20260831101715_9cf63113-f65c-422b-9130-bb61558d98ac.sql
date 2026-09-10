-- 1. Shipping labels: explicit admin-only modification coverage
DROP POLICY IF EXISTS "Admins can update labels" ON storage.objects;
CREATE POLICY "Admins can update labels"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'labels' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'labels' AND has_role(auth.uid(), 'admin'::app_role));

-- 2. Checkout configuration: explicit read paths, least-privilege grants
REVOKE ALL ON public.checkout_config FROM anon;
REVOKE ALL ON public.checkout_config FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_config TO authenticated;
GRANT ALL ON public.checkout_config TO service_role;

DROP POLICY IF EXISTS "Admins can read checkout config" ON public.checkout_config;
CREATE POLICY "Admins can read checkout config"
ON public.checkout_config FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

REVOKE ALL ON public.checkout_config_public FROM anon;
REVOKE ALL ON public.checkout_config_public FROM authenticated;
GRANT SELECT ON public.checkout_config_public TO anon, authenticated;
GRANT SELECT ON public.checkout_config_public TO service_role;