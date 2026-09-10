
-- ============================================================
-- PRODUCT REVIEWS
-- ============================================================
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  size_purchased TEXT,
  admin_reply TEXT,
  admin_reply_at TIMESTAMPTZ,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX idx_product_reviews_product ON public.product_reviews(product_id, status);
CREATE INDEX idx_product_reviews_user ON public.product_reviews(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT SELECT ON public.product_reviews TO anon;
GRANT ALL ON public.product_reviews TO service_role;

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads approved reviews"
  ON public.product_reviews FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users read their own reviews"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all reviews"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins manage reviews"
  ON public.product_reviews FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Users can edit their pending reviews within 30 days"
  ON public.product_reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND created_at > now() - interval '30 days')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
  ON public.product_reviews FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_product_reviews_updated
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- HELPFUL VOTES
-- ============================================================
CREATE TABLE public.product_review_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.product_review_votes TO authenticated;
GRANT ALL ON public.product_review_votes TO service_role;

ALTER TABLE public.product_review_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own votes"
  ON public.product_review_votes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert their own votes"
  ON public.product_review_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete their own votes"
  ON public.product_review_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- ELIGIBILITY: does the current user have a delivered order for this product?
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_user_review_product(p_product_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order RECORD;
  v_existing UUID;
  v_size TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  SELECT id INTO v_existing FROM public.product_reviews
    WHERE user_id = v_uid AND product_id = p_product_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'ALREADY_REVIEWED', 'reviewId', v_existing);
  END IF;

  SELECT o.id, o.order_number, o.created_at,
    (SELECT it->>'size' FROM jsonb_array_elements(o.items) it
       WHERE (it->>'productId')::UUID = p_product_id LIMIT 1) AS size
  INTO v_order
  FROM public.orders o
  WHERE o.user_id = v_uid
    AND lower(o.status) IN ('delivered','completed','shipped')
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(o.items) it
      WHERE (it->>'productId')::UUID = p_product_id
    )
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'NO_PURCHASE');
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'orderId', v_order.id,
    'orderNumber', v_order.order_number,
    'size', v_order.size
  );
END;
$$;

-- ============================================================
-- SUBMIT REVIEW (verifies purchase server-side)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_product_review(
  p_product_id UUID,
  p_rating SMALLINT,
  p_title TEXT,
  p_comment TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_eligibility jsonb;
  v_auto_approve BOOLEAN := true;
  v_status TEXT;
  v_review_id UUID;
  v_size TEXT;
  v_order_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error','NOT_AUTHENTICATED');
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('error','INVALID_RATING');
  END IF;
  IF p_comment IS NULL OR length(trim(p_comment)) < 10 THEN
    RETURN jsonb_build_object('error','COMMENT_TOO_SHORT');
  END IF;
  IF length(p_comment) > 2000 OR length(coalesce(p_title,'')) > 120 THEN
    RETURN jsonb_build_object('error','TOO_LONG');
  END IF;

  v_eligibility := public.can_user_review_product(p_product_id);
  IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RETURN jsonb_build_object('error', v_eligibility->>'reason');
  END IF;

  v_order_id := (v_eligibility->>'orderId')::UUID;
  v_size := v_eligibility->>'size';

  -- Read auto-approve toggle from design_settings.settings_json
  BEGIN
    SELECT COALESCE((settings_json->'reviews'->>'autoApprove')::BOOLEAN, true)
    INTO v_auto_approve
    FROM public.design_settings
    WHERE settings_key = 'main'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_auto_approve := true;
  END;

  v_status := CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END;

  INSERT INTO public.product_reviews (
    product_id, user_id, order_id, rating, title, comment,
    status, is_verified_purchase, size_purchased
  ) VALUES (
    p_product_id, v_uid, v_order_id, p_rating,
    NULLIF(trim(p_title),''), trim(p_comment),
    v_status, true, v_size
  )
  RETURNING id INTO v_review_id;

  RETURN jsonb_build_object('success', true, 'reviewId', v_review_id, 'status', v_status);
END;
$$;

-- ============================================================
-- STATS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_product_review_stats(p_product_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_avg NUMERIC;
  v_dist jsonb;
BEGIN
  SELECT count(*), COALESCE(avg(rating),0)
  INTO v_count, v_avg
  FROM public.product_reviews
  WHERE product_id = p_product_id AND status = 'approved';

  SELECT jsonb_object_agg(r::TEXT, c) INTO v_dist FROM (
    SELECT r, COALESCE(SUM(CASE WHEN pr.rating = r THEN 1 ELSE 0 END),0)::INTEGER AS c
    FROM generate_series(1,5) r
    LEFT JOIN public.product_reviews pr
      ON pr.product_id = p_product_id AND pr.status = 'approved' AND pr.rating = r
    GROUP BY r
  ) s;

  RETURN jsonb_build_object(
    'count', v_count,
    'average', ROUND(v_avg::NUMERIC, 2),
    'distribution', COALESCE(v_dist, '{}'::jsonb)
  );
END;
$$;

-- ============================================================
-- VOTE HELPFUL
-- ============================================================
CREATE OR REPLACE FUNCTION public.vote_review_helpful(p_review_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  BEGIN
    INSERT INTO public.product_review_votes (review_id, user_id) VALUES (p_review_id, v_uid);
    UPDATE public.product_reviews SET helpful_count = helpful_count + 1 WHERE id = p_review_id;
    RETURN jsonb_build_object('success', true, 'voted', true);
  EXCEPTION WHEN unique_violation THEN
    DELETE FROM public.product_review_votes WHERE review_id = p_review_id AND user_id = v_uid;
    UPDATE public.product_reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = p_review_id;
    RETURN jsonb_build_object('success', true, 'voted', false);
  END;
END;
$$;

-- ============================================================
-- MODERATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.moderate_review(
  p_review_id UUID,
  p_action TEXT,
  p_reply TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) THEN
    RETURN jsonb_build_object('error','FORBIDDEN');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.product_reviews SET status = 'approved' WHERE id = p_review_id;
  ELSIF p_action = 'reject' THEN
    UPDATE public.product_reviews SET status = 'rejected' WHERE id = p_review_id;
  ELSIF p_action = 'reply' THEN
    UPDATE public.product_reviews
      SET admin_reply = NULLIF(trim(p_reply),''), admin_reply_at = now()
      WHERE id = p_review_id;
  ELSE
    RETURN jsonb_build_object('error','INVALID_ACTION');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
