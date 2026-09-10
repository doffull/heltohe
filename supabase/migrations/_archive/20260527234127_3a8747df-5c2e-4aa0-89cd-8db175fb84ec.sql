
-- Drop the SECURITY DEFINER view flagged by the linter
DROP VIEW IF EXISTS public.roulette_config_public;

-- Recreate as security_invoker view (safe, respects RLS)
CREATE VIEW public.roulette_config_public
WITH (security_invoker = true)
AS
SELECT
  id, config_key, enabled, title, subtitle, button_label, fab_label,
  cooldown_hours, reward_validity_days, require_email,
  auto_open_on_landing, auto_open_delay_ms, show_after_dismiss_hours, game_type
FROM public.roulette_config;

-- Allow public SELECT but only on non-sensitive columns via column-level grants
REVOKE SELECT ON public.roulette_config FROM anon, authenticated;
GRANT SELECT (
  id, config_key, enabled, title, subtitle, button_label, fab_label,
  cooldown_hours, reward_validity_days, require_email,
  auto_open_on_landing, auto_open_delay_ms, show_after_dismiss_hours, game_type,
  created_at, updated_at
) ON public.roulette_config TO anon, authenticated;

-- Admins keep full access via the table grant
GRANT ALL ON public.roulette_config TO service_role;

-- Re-add a permissive SELECT policy (column grants do the actual restriction)
CREATE POLICY "Public can read non-sensitive roulette config"
ON public.roulette_config
FOR SELECT
USING (true);

GRANT SELECT ON public.roulette_config_public TO anon, authenticated;
