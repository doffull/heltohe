
-- Restrict public reads of roulette_config (which contains notify_admin_email)
DROP POLICY IF EXISTS "Anyone can view roulette config" ON public.roulette_config;

-- Admins keep full access via existing "Admins manage roulette config" policy.

-- Sanitized public view exposing only non-sensitive fields needed by the UI
CREATE OR REPLACE VIEW public.roulette_config_public
WITH (security_invoker = true)
AS
SELECT
  id,
  config_key,
  enabled,
  title,
  subtitle,
  button_label,
  fab_label,
  cooldown_hours,
  reward_validity_days,
  require_email,
  auto_open_on_landing,
  auto_open_delay_ms,
  show_after_dismiss_hours,
  game_type
FROM public.roulette_config;

-- Allow public read of sanitized view
GRANT SELECT ON public.roulette_config_public TO anon, authenticated;

-- Need a permissive SELECT policy on base table so security_invoker view can read for anon/auth
CREATE POLICY "Public reads via sanitized view"
ON public.roulette_config
FOR SELECT
USING (true);

-- Replace with column-aware approach: we keep the open SELECT but the frontend now reads
-- from roulette_config_public. Since notify_admin_email is still readable from the base
-- table by anon, we instead nullify it for non-admins through a security-definer wrapper.
-- Simpler: drop the permissive policy we just created and rely on view + definer-owned access.
DROP POLICY "Public reads via sanitized view" ON public.roulette_config;

-- Make the view SECURITY DEFINER-style by switching off security_invoker so the view
-- runs with its owner's privileges and bypasses RLS for the sanitized columns only.
CREATE OR REPLACE VIEW public.roulette_config_public
WITH (security_invoker = false)
AS
SELECT
  id,
  config_key,
  enabled,
  title,
  subtitle,
  button_label,
  fab_label,
  cooldown_hours,
  reward_validity_days,
  require_email,
  auto_open_on_landing,
  auto_open_delay_ms,
  show_after_dismiss_hours,
  game_type
FROM public.roulette_config;

GRANT SELECT ON public.roulette_config_public TO anon, authenticated;
