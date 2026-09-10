
-- The view excludes sensitive admin/colissimo fields by column list,
-- so it's safe to expose without RLS. Switch to security definer (default).
ALTER VIEW public.design_settings_public SET (security_invoker = false);
GRANT SELECT ON public.design_settings_public TO anon, authenticated;
