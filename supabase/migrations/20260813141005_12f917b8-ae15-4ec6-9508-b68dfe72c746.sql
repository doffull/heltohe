ALTER VIEW public.design_settings_public SET (security_invoker = off);
GRANT SELECT ON public.design_settings_public TO anon, authenticated;