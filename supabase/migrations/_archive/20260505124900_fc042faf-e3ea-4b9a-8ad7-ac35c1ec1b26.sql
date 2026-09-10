
-- 1. design_settings: add restrictive SELECT for authenticated (admins only)
CREATE POLICY "Restrict design_settings reads to admins"
  ON public.design_settings AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Deny anon design_settings"
  ON public.design_settings AS RESTRICTIVE FOR SELECT TO anon
  USING (false);

-- 2. promo_codes: add restrictive SELECT to admins only
CREATE POLICY "Restrict promo_codes reads to admins"
  ON public.promo_codes AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Deny anon promo_codes"
  ON public.promo_codes AS RESTRICTIVE FOR SELECT TO anon
  USING (false);

-- Public RPC to preview promo code discount safely (server-validates only)
CREATE OR REPLACE FUNCTION public.preview_promo_code(p_code text, p_subtotal numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_discount NUMERIC := 0;
BEGIN
  IF p_code IS NULL OR p_code = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code promo invalide');
  END IF;
  SELECT * INTO v_promo FROM public.promo_codes
   WHERE code = UPPER(p_code)
     AND is_active = TRUE
     AND (expires_at IS NULL OR expires_at > NOW())
     AND (starts_at IS NULL OR starts_at <= NOW());
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code promo invalide');
  END IF;
  IF v_promo.usage_limit IS NOT NULL AND COALESCE(v_promo.usage_count,0) >= v_promo.usage_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ce code promo a atteint sa limite d''utilisation');
  END IF;
  IF v_promo.min_purchase IS NOT NULL AND p_subtotal < v_promo.min_purchase THEN
    RETURN jsonb_build_object('success', false, 'message', 'Montant minimum requis: ' || v_promo.min_purchase || '€');
  END IF;
  IF v_promo.type = 'percentage' THEN
    v_discount := p_subtotal * (v_promo.value / 100.0);
    IF v_promo.max_discount IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_promo.max_discount);
    END IF;
  ELSIF v_promo.type = 'fixed_amount' THEN
    v_discount := LEAST(v_promo.value, p_subtotal);
  ELSIF v_promo.type = 'free_shipping' THEN
    v_discount := 0;
  END IF;
  RETURN jsonb_build_object(
    'success', true,
    'discount', v_discount,
    'type', v_promo.type,
    'message', 'Code appliqué'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.preview_promo_code(text, numeric) TO anon, authenticated;

-- 3. stock_levels: restrict to staff
DROP POLICY IF EXISTS "Anyone can view stock levels" ON public.stock_levels;
CREATE POLICY "Staff can view stock levels"
  ON public.stock_levels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'stock_manager'::app_role));

-- 4. inventory: restrict to staff
DROP POLICY IF EXISTS "Anyone can view inventory" ON public.inventory;
CREATE POLICY "Staff can view inventory"
  ON public.inventory FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'stock_manager'::app_role));

-- 5. bot_config: restrict system_prompt; expose minimal public view
DROP POLICY IF EXISTS "Anyone can view bot config" ON public.bot_config;

CREATE OR REPLACE VIEW public.bot_config_public
WITH (security_invoker = true) AS
  SELECT id, bot_name, bot_avatar, welcome_message, suggestions, is_active
  FROM public.bot_config
  WHERE is_active = true;

GRANT SELECT ON public.bot_config_public TO anon, authenticated;

-- Allow underlying SELECT only for admins on full table
CREATE POLICY "Admins can read full bot_config"
  ON public.bot_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow the view (security_invoker) to read minimal columns publicly via a column-restricted policy:
-- We need a SELECT policy that allows anon/auth to read rows where is_active = true,
-- but to restrict columns we rely on the view's column list. Since security_invoker uses the
-- caller's privileges, we need a permissive SELECT policy on bot_config for anon/authenticated
-- limited to active rows. Column-level access is controlled via GRANTs.
CREATE POLICY "Public can view active bot config rows"
  ON public.bot_config FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Revoke broad column access and grant only safe columns to anon/authenticated
REVOKE SELECT ON public.bot_config FROM anon, authenticated;
GRANT SELECT (id, bot_name, bot_avatar, welcome_message, suggestions, is_active)
  ON public.bot_config TO anon, authenticated;
