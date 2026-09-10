CREATE OR REPLACE FUNCTION public.validate_and_create_order(p_items jsonb, p_promo_code text, p_delivery_mode text, p_order_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item JSONB;
  v_product RECORD;
  v_subtotal NUMERIC := 0;
  v_order_items JSONB := '[]'::JSONB;
  v_promo_discount NUMERIC := 0;
  v_shipping_cost NUMERIC := 0;
  v_tax NUMERIC;
  v_order_total NUMERIC;
  v_order_id UUID;
  v_order_number TEXT;
  v_promo RECORD;
  v_unit_price NUMERIC;
  v_qty INT;
  v_cfg RECORD;
  v_home NUMERIC;
  v_relay NUMERIC;
  v_threshold NUMERIC;
  v_relay_only BOOLEAN;
  v_free_shipping BOOLEAN := FALSE;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'EMPTY_CART');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name, price, sale_price, stock, is_active
      INTO v_product
      FROM public.products
     WHERE id = (v_item->>'productId')::UUID
       AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'PRODUCT_NOT_FOUND', 'productId', v_item->>'productId');
    END IF;

    IF NOT v_product.is_active THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'PRODUCT_INACTIVE', 'productId', v_item->>'productId');
    END IF;

    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::INT, 1));
    v_unit_price := COALESCE(v_product.sale_price, v_product.price);
    v_subtotal := v_subtotal + (v_unit_price * v_qty);

    v_order_items := v_order_items || jsonb_build_object(
      'productId', v_product.id,
      'name', v_product.name,
      'price', v_unit_price,
      'quantity', v_qty,
      'size', v_item->>'size',
      'color', v_item->>'color'
    );
  END LOOP;

  IF p_promo_code IS NOT NULL AND p_promo_code <> '' THEN
    SELECT * INTO v_promo
      FROM public.promo_codes
     WHERE UPPER(code) = UPPER(p_promo_code)
       AND is_active = TRUE
       AND (starts_at IS NULL OR starts_at <= now())
       AND (expires_at IS NULL OR expires_at >= now())
     LIMIT 1;

    IF FOUND THEN
      IF v_promo.min_purchase IS NULL OR v_subtotal >= v_promo.min_purchase THEN
        IF v_promo.type = 'percentage' THEN
          v_promo_discount := v_subtotal * (v_promo.value / 100.0);
        ELSIF v_promo.type = 'fixed_amount' THEN
          v_promo_discount := LEAST(v_promo.value, v_subtotal);
        ELSIF v_promo.type = 'free_shipping' THEN
          v_free_shipping := TRUE;
        END IF;
      END IF;
    END IF;
  END IF;

  SELECT shipping_home_price, shipping_relay_price, free_shipping_threshold, free_shipping_relay_only
    INTO v_cfg
    FROM public.checkout_config
   WHERE config_key = 'main'
   LIMIT 1;

  v_home := COALESCE(v_cfg.shipping_home_price, 15);
  v_relay := COALESCE(v_cfg.shipping_relay_price, 4.5);
  v_threshold := COALESCE(v_cfg.free_shipping_threshold, 99);
  v_relay_only := COALESCE(v_cfg.free_shipping_relay_only, TRUE);

  IF p_delivery_mode = 'relay' THEN
    v_shipping_cost := CASE
      WHEN (v_subtotal - v_promo_discount) >= v_threshold THEN 0
      ELSE v_relay
    END;
  ELSE
    v_shipping_cost := CASE
      WHEN (v_subtotal - v_promo_discount) >= v_threshold AND NOT v_relay_only THEN 0
      ELSE v_home
    END;
  END IF;

  IF v_free_shipping THEN
    v_shipping_cost := 0;
  END IF;

  v_order_total := GREATEST(0, (v_subtotal - v_promo_discount) + v_shipping_cost);
  -- Les prix sont déjà TTC : plus aucune TVA n'est calculée ni enregistrée.
  v_tax := 0;

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
$function$;