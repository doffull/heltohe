-- Restore table-level SELECT for authenticated; row access is still limited to
-- admins by the RESTRICTIVE policy "Restrict bot_config reads to admins".
GRANT SELECT ON public.bot_config TO authenticated;
GRANT UPDATE ON public.bot_config TO authenticated;
GRANT ALL ON public.bot_config TO service_role;

-- anon keeps no SELECT on the base table (widget uses bot_config_public view).
REVOKE SELECT ON public.bot_config FROM anon;