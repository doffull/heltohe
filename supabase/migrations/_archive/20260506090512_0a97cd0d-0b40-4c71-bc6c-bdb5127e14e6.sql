
-- ============= ROULETTE CONFIG =============
CREATE TABLE public.roulette_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL DEFAULT 'main' UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  title TEXT NOT NULL DEFAULT 'Roulette de la Chance',
  subtitle TEXT NOT NULL DEFAULT 'Tentez votre chance une fois par jour !',
  button_label TEXT NOT NULL DEFAULT 'Tourner la roue',
  fab_label TEXT NOT NULL DEFAULT '🎁 Jeu du jour',
  cooldown_hours INTEGER NOT NULL DEFAULT 24,
  reward_validity_days INTEGER NOT NULL DEFAULT 7,
  require_email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roulette_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view roulette config"
  ON public.roulette_config FOR SELECT USING (true);

CREATE POLICY "Admins manage roulette config"
  ON public.roulette_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_roulette_config_updated
  BEFORE UPDATE ON public.roulette_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.roulette_config (config_key) VALUES ('main');

-- ============= ROULETTE SEGMENTS =============
CREATE TABLE public.roulette_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  reward_type TEXT NOT NULL CHECK (reward_type IN ('percentage','fixed_amount','free_shipping','nothing')),
  reward_value NUMERIC NOT NULL DEFAULT 0,
  min_purchase NUMERIC NOT NULL DEFAULT 0,
  max_discount NUMERIC,
  probability_weight INTEGER NOT NULL DEFAULT 10,
  color TEXT NOT NULL DEFAULT '#000000',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  icon TEXT DEFAULT '🎁',
  code_prefix TEXT NOT NULL DEFAULT 'SPIN',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_wins_per_day INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roulette_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active segments"
  ON public.roulette_segments FOR SELECT USING (is_active = true);

CREATE POLICY "Admins view all segments"
  ON public.roulette_segments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage segments"
  ON public.roulette_segments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_roulette_segments_updated
  BEFORE UPDATE ON public.roulette_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed segments
INSERT INTO public.roulette_segments (label, description, reward_type, reward_value, min_purchase, probability_weight, color, text_color, icon, code_prefix, sort_order) VALUES
  ('-10%',         'Réduction de 10%',          'percentage',    10,  0,   25, '#0a0a0a', '#ffffff', '🎯', 'SPIN10',  1),
  ('Livraison offerte', 'Livraison gratuite',   'free_shipping', 0,   0,   20, '#1a1a1a', '#ffffff', '🚚', 'SHIP',    2),
  ('-5€',          '5€ de remise',              'fixed_amount',  5,   30,  20, '#2a2a2a', '#ffffff', '💶', 'SPIN5',   3),
  ('Dommage…',     'Pas de chance, retentez demain', 'nothing',  0,   0,   30, '#3a3a3a', '#ffffff', '🎲', 'NONE',    4),
  ('-20%',         'Réduction de 20%',          'percentage',    20,  50,  4,  '#000000', '#ffffff', '⭐', 'SPIN20',  5),
  ('-50%',         'Jackpot ! -50%',            'percentage',    50,  80,  1,  '#0a0a0a', '#ffd700', '👑', 'JACKPOT', 6);

-- ============= ROULETTE SPINS =============
CREATE TABLE public.roulette_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT,
  ip_hash TEXT,
  segment_id UUID NOT NULL REFERENCES public.roulette_segments(id) ON DELETE RESTRICT,
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  promo_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spins_user ON public.roulette_spins(user_id, created_at DESC);
CREATE INDEX idx_spins_email ON public.roulette_spins(email, created_at DESC);

ALTER TABLE public.roulette_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own spins"
  ON public.roulette_spins FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins view all spins"
  ON public.roulette_spins FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage spins"
  ON public.roulette_spins FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============= SPIN RPC =============
CREATE OR REPLACE FUNCTION public.spin_roulette(p_email TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_uid UUID := auth.uid();
  v_email TEXT := lower(trim(coalesce(p_email, '')));
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
BEGIN
  SELECT * INTO v_config FROM public.roulette_config WHERE config_key='main';
  IF NOT v_config.enabled THEN
    RETURN jsonb_build_object('error','DISABLED');
  END IF;

  IF v_uid IS NULL AND (v_email = '' OR v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RETURN jsonb_build_object('error','EMAIL_REQUIRED');
  END IF;

  -- Cooldown check
  SELECT max(created_at) INTO v_last_spin
  FROM public.roulette_spins
  WHERE (v_uid IS NOT NULL AND user_id = v_uid)
     OR (v_uid IS NULL AND email = v_email);

  IF v_last_spin IS NOT NULL AND v_last_spin > now() - (v_config.cooldown_hours || ' hours')::interval THEN
    RETURN jsonb_build_object(
      'error','COOLDOWN',
      'nextAvailableAt', v_last_spin + (v_config.cooldown_hours || ' hours')::interval
    );
  END IF;

  -- Weighted random pick (server-side)
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

  -- Daily cap per segment
  IF v_segment.max_wins_per_day IS NOT NULL THEN
    SELECT count(*) INTO v_today_count
    FROM public.roulette_spins
    WHERE segment_id = v_segment.id
      AND created_at > now() - interval '1 day';
    IF v_today_count >= v_segment.max_wins_per_day THEN
      -- fallback: pick the "nothing" segment if any
      SELECT * INTO v_segment FROM public.roulette_segments
       WHERE is_active = true AND reward_type = 'nothing' LIMIT 1;
      IF v_segment.id IS NULL THEN
        RETURN jsonb_build_object('error','LIMIT_REACHED');
      END IF;
    END IF;
  END IF;

  -- Generate promo code (if reward != nothing)
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

  INSERT INTO public.roulette_spins (user_id, email, segment_id, promo_code_id, promo_code)
  VALUES (v_uid, NULLIF(v_email,''), v_segment.id, v_promo_id, v_code)
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
    'nextAvailableAt', now() + (v_config.cooldown_hours || ' hours')::interval
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.spin_roulette(TEXT) TO anon, authenticated;
