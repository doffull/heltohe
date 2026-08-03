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
  FREE_SHIPPING_THRESHOLD CONSTANT NUMERIC := 200;
  HOME_SHIPPING CONSTANT NUMERIC := 6.5;
  RELAY_SHIPPING CONSTANT NUMERIC := 4.5;
BEGIN
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
      RETURN jsonb_build_object('error', 'PRODUCT_INACTIVE', 'productId', v_item->>'productId');
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

  IF v_subtotal >= FREE_SHIPPING_THRESHOLD THEN
    v_shipping_cost := 0;
  ELSIF p_delivery_mode = 'home' THEN
    v_shipping_cost := HOME_SHIPPING;
  ELSE
    v_shipping_cost := RELAY_SHIPPING;
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
$function$;