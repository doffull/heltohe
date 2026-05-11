-- Fix: published site was showing default values (no logo, no hero, "MON SITE" title)
-- because the anon role lacked table-level GRANTs even though RLS policies allowed reads.
-- Postgres requires BOTH a GRANT and a passing RLS policy.

GRANT SELECT ON public.design_settings TO anon, authenticated;
GRANT SELECT ON public.design_settings_public TO anon, authenticated;

-- Visitor analytics: policy already allows anon INSERT, GRANT was missing.
GRANT INSERT, SELECT ON public.visitor_sessions TO anon, authenticated;