-- 1. Checkout config: relay-only free shipping
ALTER TABLE public.checkout_config
  ADD COLUMN IF NOT EXISTS free_shipping_relay_only BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.checkout_config
SET free_shipping_relay_only = TRUE,
    shipping_home_price = 15,
    free_shipping_threshold = 99
WHERE config_key = 'main';

-- 2. Contact messages: automatic AI reply
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS auto_reply TEXT,
  ADD COLUMN IF NOT EXISTS auto_replied_at TIMESTAMPTZ;

-- 3. FAQ items
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faq_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;
GRANT ALL ON public.faq_items TO service_role;

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active FAQ items" ON public.faq_items;
CREATE POLICY "Anyone can read active FAQ items"
ON public.faq_items FOR SELECT TO anon, authenticated
USING (is_active = TRUE OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage FAQ items" ON public.faq_items;
CREATE POLICY "Admins can manage FAQ items"
ON public.faq_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_faq_items_updated_at ON public.faq_items;
CREATE TRIGGER update_faq_items_updated_at
BEFORE UPDATE ON public.faq_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.faq_items (question, answer, category, sort_order)
SELECT * FROM (VALUES
  ('Quels sont les délais de livraison ?', 'Vos commandes sont préparées sous 24 à 48h ouvrées. La livraison Colissimo prend ensuite 2 à 3 jours ouvrés en France métropolitaine.', 'livraison', 1),
  ('La livraison est-elle gratuite ?', 'La livraison en point relais est offerte dès 99 € d''achat. La livraison à domicile est facturée 15 €, quel que soit le montant de la commande.', 'livraison', 2),
  ('Comment suivre ma commande ?', 'Dès l''expédition, vous recevez un e-mail avec votre numéro de suivi. Vous pouvez aussi consulter l''avancement dans votre espace client, rubrique « Où en est mon colis ».', 'livraison', 3),
  ('Puis-je retourner un article ?', 'Vous disposez de 14 jours après réception pour nous retourner un article non porté, dans son emballage d''origine. Les articles enfants ne sont ni repris ni échangés.', 'retours', 4),
  ('Quels moyens de paiement acceptez-vous ?', 'Carte bancaire, PayPal et virement bancaire. Tous les paiements sont sécurisés.', 'paiement', 5),
  ('Comment choisir ma taille ?', 'Chaque fiche produit dispose d''un guide des tailles. En cas de doute, écrivez-nous : nous vous conseillons la taille adaptée à votre morphologie.', 'produits', 6)
) AS v(question, answer, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.faq_items);

-- 4. Customer profile creation (server-side, called on sign-in)
CREATE OR REPLACE FUNCTION public.ensure_customer_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_meta JSONB;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT email, COALESCE(raw_user_meta_data, '{}'::jsonb)
  INTO v_email, v_meta
  FROM auth.users WHERE id = v_uid;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('error', 'USER_NOT_FOUND');
  END IF;

  SELECT id INTO v_id FROM public.customers WHERE user_id = v_uid;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', TRUE, 'customerId', v_id, 'created', FALSE);
  END IF;

  -- Link an existing imported/guest record with the same email, else create one
  UPDATE public.customers
  SET user_id = v_uid,
      first_name = COALESCE(NULLIF(first_name, ''), v_meta->>'first_name', ''),
      last_name = COALESCE(NULLIF(last_name, ''), v_meta->>'last_name', '')
  WHERE lower(email) = lower(v_email) AND user_id IS NULL
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO public.customers (user_id, email, first_name, last_name, source)
    VALUES (v_uid, v_email, COALESCE(v_meta->>'first_name', ''), COALESCE(v_meta->>'last_name', ''), 'site')
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'customerId', v_id, 'created', TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_customer_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_customer_profile() TO authenticated;

-- Backfill existing signed-up accounts
INSERT INTO public.customers (user_id, email, first_name, last_name, source, created_at)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data->>'first_name', ''),
       COALESCE(u.raw_user_meta_data->>'last_name', ''),
       'site',
       u.created_at
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE lower(c.email) = lower(u.email));

UPDATE public.customers c
SET user_id = u.id
FROM auth.users u
WHERE c.user_id IS NULL AND lower(c.email) = lower(u.email);

-- 5. Order validation reads the saved checkout configuration
CREATE OR REPLACE FUNCTION public.validate_and_create_order(
  p_items jsonb,
  p_promo_code text,
  p_delivery_mode text,
  p_order_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_product RECORD;
  v_subtotal NUMERIC := 0;
  v_promo_discount NUMERIC := 0;
  v_shipping_cost NUMERIC;
  v_order_total NUMERIC;
  v_tax NUMERIC;
  v_promo RECORD;
  v_free_shipping BOOLEAN := FALSE;
  v_order_items JSONB := '[]'::JSONB;
  v_order_id UUID;
  v_order_number TEXT;
  v_unit_price NUMERIC;
  v_qty INTEGER;
  v_cfg RECORD;
  v_threshold NUMERIC;
  v_home NUMERIC;
  v_relay NUMERIC;
  v_relay_only BOOLEAN;
BEGIN
  SELECT free_shipping_threshold, shipping_home_price, shipping_relay_price, free_shipping_relay_only
  INTO v_cfg
  FROM public.checkout_config WHERE config_key = 'main';

  v_threshold := COALESCE(v_cfg.free_shipping_threshold, 99);
  v_home := COALESCE(v_cfg.shipping_home_price, 15);
  v_relay := COALESCE(v_cfg.shipping_relay_price, 4.5);
  v_relay_only := COALESCE(v_cfg.free_shipping_relay_only, TRUE);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name, price, sale_price, image, is_active
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'productId')::UUID;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'PRODUCT_NOT_FOUND', 'productId', v_item->>'productId');
    END IF;

    IF NOT v_product.is_active THEN
      RETURN jsonb_build_object('error', 'PRODUCT_INACTIVE', 'productId', v_item->>'productId', 'productName', v_product.name);
    END IF;

    v_unit_price := COALESCE(v_product.sale_price, v_product.price);
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_qty <= 0 OR v_qty > 100 THEN
      RETURN jsonb_build_object('error', 'INVALID_QUANTITY', 'productId', v_item->>'productId');
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);

    v_order_items := v_order_items || jsonb_build_array(
      jsonb_build_object(
        'productId', v_product.id,
        'name', v_product.name,
        'price', v_unit_price,
        'quantity', v_qty,
        'size', v_item->>'size',
        'color', v_item->>'color',
        'image', v_product.image
      )
    );
  END LOOP;

  IF jsonb_array_length(v_order_items) = 0 THEN
    RETURN jsonb_build_object('error', 'EMPTY_ORDER');
  END IF;

  IF p_promo_code IS NOT NULL AND p_promo_code <> '' THEN
    SELECT * INTO v_promo
    FROM public.promo_codes
    WHERE code = UPPER(p_promo_code)
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (usage_limit IS NULL OR usage_count < usage_limit)
      AND (min_purchase IS NULL OR v_subtotal >= min_purchase);

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'INVALID_PROMO_CODE');
    END IF;

    IF v_promo.type = 'percentage' THEN
      v_promo_discount := v_subtotal * (v_promo.value / 100.0);
      IF v_promo.max_discount IS NOT NULL THEN
        v_promo_discount := LEAST(v_promo_discount, v_promo.max_discount);
      END IF;
    ELSIF v_promo.type = 'fixed_amount' THEN
      v_promo_discount := LEAST(v_promo.value, v_subtotal);
    ELSIF v_promo.type = 'free_shipping' THEN
      v_promo_discount := 0;
      v_free_shipping := TRUE;
    END IF;

    UPDATE public.promo_codes SET usage_count = COALESCE(usage_count, 0) + 1 WHERE id = v_promo.id;
  END IF;

  IF p_delivery_mode = 'home' THEN
    v_shipping_cost := CASE
      WHEN NOT v_relay_only AND v_subtotal >= v_threshold THEN 0
      ELSE v_home
    END;
  ELSE
    v_shipping_cost := CASE
      WHEN v_subtotal >= v_threshold THEN 0
      ELSE v_relay
    END;
  END IF;

  IF v_free_shipping THEN
    v_shipping_cost := 0;
  END IF;

  v_order_total := GREATEST(0, (v_subtotal - v_promo_discount) + v_shipping_cost);
  v_tax := v_order_total * 0.2 / 1.2;

  v_order_number := p_order_data->>'order_number';

  INSERT INTO public.orders (
    order_number, user_id, customer_email, customer_name, customer_phone,
    customer_address, customer_city, customer_zip, customer_country, items,
    subtotal, shipping_cost, tax, total, payment_method, payment_status, status, shipping_carrier
  ) VALUES (
    v_order_number,
    CASE WHEN (p_order_data->>'user_id') IS NOT NULL AND (p_order_data->>'user_id') <> '' THEN (p_order_data->>'user_id')::UUID ELSE NULL END,
    p_order_data->>'customer_email',
    p_order_data->>'customer_name',
    p_order_data->>'customer_phone',
    p_order_data->>'customer_address',
    p_order_data->>'customer_city',
    p_order_data->>'customer_zip',
    COALESCE(p_order_data->>'customer_country', 'France'),
    v_order_items,
    v_subtotal - v_promo_discount,
    v_shipping_cost,
    v_tax,
    v_order_total,
    'manual',
    'pending',
    'pending',
    'colissimo'
  )
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'orderId', v_order_id,
    'orderNumber', v_order_number,
    'subtotal', v_subtotal - v_promo_discount,
    'shippingCost', v_shipping_cost,
    'tax', v_tax,
    'total', v_order_total,
    'items', v_order_items
  );
END;
$$;
