
-- 1. Track points awarded
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS loyalty_awarded_at TIMESTAMPTZ;

-- 2. Award points function
CREATE OR REPLACE FUNCTION public.award_loyalty_points(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_customer RECORD;
  v_multiplier NUMERIC;
  v_points INTEGER;
  v_new_total INTEGER;
  v_new_tier loyalty_tier;
  v_new_total_spent NUMERIC;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','ORDER_NOT_FOUND'); END IF;
  IF v_order.loyalty_awarded_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_awarded', true);
  END IF;
  IF v_order.user_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'guest_order', true);
  END IF;

  SELECT * INTO v_customer FROM public.customers WHERE user_id = v_order.user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','CUSTOMER_NOT_FOUND'); END IF;

  v_multiplier := CASE v_customer.loyalty_tier
    WHEN 'silver' THEN 1.5
    WHEN 'gold' THEN 2.0
    WHEN 'platinum' THEN 3.0
    ELSE 1.0
  END;

  v_points := FLOOR(COALESCE(v_order.subtotal, 0) * v_multiplier)::INTEGER;
  v_new_total := COALESCE(v_customer.loyalty_points, 0) + v_points;
  v_new_total_spent := COALESCE(v_customer.total_spent, 0) + COALESCE(v_order.total, 0);

  v_new_tier := CASE
    WHEN v_new_total >= 5000 THEN 'platinum'::loyalty_tier
    WHEN v_new_total >= 1500 THEN 'gold'::loyalty_tier
    WHEN v_new_total >= 500 THEN 'silver'::loyalty_tier
    ELSE 'bronze'::loyalty_tier
  END;

  UPDATE public.customers
    SET loyalty_points = v_new_total,
        loyalty_tier = v_new_tier,
        total_spent = v_new_total_spent,
        updated_at = now()
    WHERE id = v_customer.id;

  INSERT INTO public.loyalty_transactions (customer_id, order_id, type, points, description)
  VALUES (v_customer.id, p_order_id, 'earn', v_points,
    'Commande ' || v_order.order_number || ' (×' || v_multiplier || ')');

  UPDATE public.orders SET loyalty_awarded_at = now() WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'points', v_points, 'newTier', v_new_tier, 'totalPoints', v_new_total);
END;
$$;

-- 3. Trigger on order status change
CREATE OR REPLACE FUNCTION public.trigger_award_loyalty_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.loyalty_awarded_at IS NULL
     AND NEW.user_id IS NOT NULL
     AND (LOWER(NEW.payment_status) = 'paid' OR LOWER(NEW.status) IN ('shipped','delivered','completed')) THEN
    PERFORM public.award_loyalty_points(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_award_loyalty ON public.orders;
CREATE TRIGGER orders_award_loyalty
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_award_loyalty_points();

-- 4. Redeem reward function
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(p_reward_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_customer RECORD;
  v_reward RECORD;
  v_code TEXT;
  v_promo_id UUID;
  v_expires TIMESTAMPTZ;
  v_promo_type promo_type;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  SELECT * INTO v_customer FROM public.customers WHERE user_id = v_uid;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','CUSTOMER_NOT_FOUND'); END IF;
  SELECT * INTO v_reward FROM public.loyalty_rewards WHERE id = p_reward_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','REWARD_NOT_FOUND'); END IF;
  IF COALESCE(v_customer.loyalty_points,0) < v_reward.points_required THEN
    RETURN jsonb_build_object('error','INSUFFICIENT_POINTS');
  END IF;

  v_promo_type := CASE v_reward.reward_type
    WHEN 'percentage' THEN 'percentage'::promo_type
    WHEN 'free_shipping' THEN 'free_shipping'::promo_type
    ELSE 'fixed_amount'::promo_type
  END;

  v_code := 'FID-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::text,'-',''),1,8));
  v_expires := now() + interval '90 days';

  INSERT INTO public.promo_codes (code, description, type, value, usage_limit, usage_count, is_active, starts_at, expires_at)
  VALUES (v_code, 'Récompense fidélité: ' || v_reward.name, v_promo_type, v_reward.value, 1, 0, true, now(), v_expires)
  RETURNING id INTO v_promo_id;

  UPDATE public.customers
    SET loyalty_points = loyalty_points - v_reward.points_required, updated_at = now()
    WHERE id = v_customer.id;

  INSERT INTO public.loyalty_transactions (customer_id, type, points, description)
  VALUES (v_customer.id, 'redeem', -v_reward.points_required,
    'Échange: ' || v_reward.name || ' (code ' || v_code || ')');

  RETURN jsonb_build_object('success', true, 'code', v_code, 'expiresAt', v_expires, 'rewardName', v_reward.name);
END;
$$;

-- 5. Seed default rewards if empty
INSERT INTO public.loyalty_rewards (name, description, points_required, reward_type, value, is_active)
SELECT * FROM (VALUES
  ('5€ de réduction', 'Bon de réduction de 5€ sur votre commande', 200, 'fixed_amount', 5::numeric, true),
  ('10€ de réduction', 'Bon de réduction de 10€ sur votre commande', 400, 'fixed_amount', 10::numeric, true),
  ('Livraison offerte', 'Livraison gratuite sur votre prochaine commande', 300, 'free_shipping', 0::numeric, true),
  ('-15% sur une commande', '15% de réduction sur l''ensemble de votre commande', 800, 'percentage', 15::numeric, true)
) AS v(name, description, points_required, reward_type, value, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_rewards);
