-- 1) boutiques: split public/anon read from admin read (remove no-op has_role for anon)
DROP POLICY IF EXISTS "Boutiques are publicly readable" ON public.boutiques;

CREATE POLICY "Active boutiques are publicly readable"
ON public.boutiques FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can read all boutiques"
ON public.boutiques FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) page_templates: public may only read templates actually in use
DROP POLICY IF EXISTS "Anyone can read page templates" ON public.page_templates;

CREATE POLICY "Public can read templates in use"
ON public.page_templates FOR SELECT
TO anon, authenticated
USING (
  is_default = true
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.template_id = page_templates.id)
  OR EXISTS (SELECT 1 FROM public.categories c WHERE c.template_id = page_templates.id)
);

-- 3) payment_gateway_secrets: explicitly deny all client access (service role only)
REVOKE ALL ON public.payment_gateway_secrets FROM anon;
REVOKE ALL ON public.payment_gateway_secrets FROM authenticated;
GRANT ALL ON public.payment_gateway_secrets TO service_role;

ALTER TABLE public.payment_gateway_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_secrets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to gateway secrets" ON public.payment_gateway_secrets;
CREATE POLICY "No client access to gateway secrets"
ON public.payment_gateway_secrets
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.payment_gateway_secrets IS 'Server-only table. Accessible exclusively via service_role in edge functions (payment-keys). No client (anon/authenticated) access.';