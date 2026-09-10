-- Re-grant EXECUTE on has_role to anon. The function is SECURITY DEFINER and
-- only checks rows in user_roles; for anon (auth.uid() IS NULL) it returns false.
-- Without this grant, every RLS policy that calls has_role() fails for anon
-- visitors with "permission denied for function has_role", which breaks public
-- reads on products, banners, popups, home_fab_buttons, roulette_segments_public,
-- bot_config_public, etc. on the published site.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;