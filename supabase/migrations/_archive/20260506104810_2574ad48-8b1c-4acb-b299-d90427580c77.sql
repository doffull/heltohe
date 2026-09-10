CREATE OR REPLACE FUNCTION public.spin_roulette(p_email text DEFAULT NULL::text, p_ip_hash text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_config RECORD;
  v_uid UUID := auth.uid();
  v_email TEXT := lower(trim(coalesce(p_email, '')));
  v_ip TEXT := nullif(trim(coalesce(p_ip_hash, '')), '');
  v_last_spin TIMESTAMPTZ;
  v_total_weight INTEGER;
  v_pick INTEGER;
  v_running INTEGER := 0;
  v_segment RECORD;
  v_today_count INTEGER;
  v_code TEXT;
  v_promo_id UUID;
  v_expires TIMESTAMPTZ;
  v_spin_id UUID;
  v_cooldown INTERVAL;
BEGIN
  SELECT * INTO v_config FROM public.roulette_config WHERE config_key='main';
  IF NOT v_config.enabled THEN
    RETURN jsonb_build_object('error','DISABLED');
  END IF;

  IF v_uid IS NULL AND (v_email = '' OR v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RETURN jsonb_build_object('error','EMAIL_REQUIRED');
  END IF;

  v_cooldown := (v_config.cooldown_hours || ' hours')::interval;

  -- Cooldown: per user_id, per email, AND per ip_hash
  SELECT max(created_at) INTO v_last_spin
  FROM public.roulette_spins
  WHERE created_at > now() - v_cooldown
    AND (
      (v_uid IS NOT NULL AND user_id = v_uid)
      OR (v_email <> '' AND email = v_email)
      OR (v_ip IS NOT NULL AND ip_hash = v_ip)
    );

  IF v_last_spin IS NOT NULL THEN
    RETURN jsonb_build_object(
      'error','COOLDOWN',
      'nextAvailableAt', v_last_spin + v_cooldown
    );
  END IF;

  SELECT COALESCE(SUM(probability_weight),0) INTO v_total_weight
  FROM public.roulette_segments WHERE is_active = true;

  IF v_total_weight <= 0 THEN
    RETURN jsonb_build_object('error','NO_SEGMENTS');
  END IF;

  v_pick := 1 + floor(random() * v_total_weight)::int;

  FOR v_segment IN
    SELECT * FROM public.roulette_segments
    WHERE is_active = true
    ORDER BY sort_order, id
  LOOP
    v_running := v_running + v_segment.probability_weight;
    IF v_pick <= v_running THEN
      EXIT;
    END IF;
  END LOOP;

  IF v_segment.max_wins_per_day IS NOT NULL THEN
    SELECT count(*) INTO v_today_count
    FROM public.roulette_spins
    WHERE segment_id = v_segment.id
      AND created_at > now() - interval '1 day';
    IF v_today_count >= v_segment.max_wins_per_day THEN
      SELECT * INTO v_segment FROM public.roulette_segments
       WHERE is_active = true AND reward_type = 'nothing' LIMIT 1;
      IF v_segment.id IS NULL THEN
        RETURN jsonb_build_object('error','LIMIT_REACHED');
      END IF;
    END IF;
  END IF;

  IF v_segment.reward_type <> 'nothing' THEN
    v_code := upper(v_segment.code_prefix) || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    v_expires := now() + (v_config.reward_validity_days || ' days')::interval;

    INSERT INTO public.promo_codes (
      code, description, type, value, min_purchase, max_discount,
      usage_limit, usage_count, is_active, starts_at, expires_at
    ) VALUES (
      v_code,
      'Gain roulette: ' || v_segment.label,
      v_segment.reward_type::promo_type,
      v_segment.reward_value,
      v_segment.min_purchase,
      v_segment.max_discount,
      1, 0, true, now(), v_expires
    ) RETURNING id INTO v_promo_id;
  END IF;

  INSERT INTO public.roulette_spins (user_id, email, ip_hash, segment_id, promo_code_id, promo_code)
  VALUES (v_uid, NULLIF(v_email,''), v_ip, v_segment.id, v_promo_id, v_code)
  RETURNING id INTO v_spin_id;

  RETURN jsonb_build_object(
    'success', true,
    'spinId', v_spin_id,
    'segmentId', v_segment.id,
    'label', v_segment.label,
    'description', v_segment.description,
    'rewardType', v_segment.reward_type,
    'rewardValue', v_segment.reward_value,
    'minPurchase', v_segment.min_purchase,
    'code', v_code,
    'expiresAt', v_expires,
    'nextAvailableAt', now() + v_cooldown
  );
END;
$function$;