CREATE OR REPLACE FUNCTION public.get_order_receipt(p_order_number text, p_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
BEGIN
  IF p_order_number IS NULL OR length(trim(p_order_number)) = 0 THEN
    RETURN jsonb_build_object('error', 'missing_order_number');
  END IF;

  SELECT * INTO o
  FROM public.orders
  WHERE order_number = trim(p_order_number)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Autorisation : propriétaire connecté, admin, ou e-mail correspondant
  IF NOT (
    (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR (p_email IS NOT NULL AND lower(trim(p_email)) = lower(trim(coalesce(o.customer_email, ''))))
  ) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  RETURN jsonb_build_object(
    'order_number', o.order_number,
    'created_at', o.created_at,
    'status', o.status,
    'payment_status', o.payment_status,
    'payment_method', o.payment_method,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'customer_address', o.customer_address,
    'customer_city', o.customer_city,
    'customer_zip', o.customer_zip,
    'customer_country', o.customer_country,
    'items', coalesce(o.items, '[]'::jsonb),
    'subtotal', o.subtotal,
    'shipping_cost', o.shipping_cost,
    'total', o.total,
    'tracking_number', o.tracking_number,
    'shipping_carrier', o.shipping_carrier
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_receipt(text, text) TO anon, authenticated, service_role;