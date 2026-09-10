
ALTER VIEW public.design_settings_public SET (security_invoker = true);

REVOKE ALL ON public.design_settings_public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.bot_config_public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.user_roles_with_email FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.design_settings_public TO anon, authenticated;
GRANT SELECT ON public.bot_config_public TO anon, authenticated;
GRANT SELECT ON public.user_roles_with_email TO authenticated;
