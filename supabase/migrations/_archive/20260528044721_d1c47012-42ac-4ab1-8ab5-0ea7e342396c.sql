-- Fix: public site reads return [] because design_settings_public uses security_invoker
-- and the base table denies anon. Switch the view back to definer mode so anonymous
-- visitors can read the curated public columns.
ALTER VIEW public.design_settings_public SET (security_invoker = false);
GRANT SELECT ON public.design_settings_public TO anon, authenticated;