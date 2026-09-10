
-- Add stock_reserved_at column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_reserved_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_consumed_at TIMESTAMPTZ;

-- Create order_preparations table
CREATE TABLE IF NOT EXISTS public.order_preparations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | assigned | in_progress | ready | cancelled
  assigned_to UUID,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ,
  prepared_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_preparations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage preparations"
  ON public.order_preparations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Stock managers manage preparations"
  ON public.order_preparations FOR ALL
  USING (has_role(auth.uid(), 'stock_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'stock_manager'::app_role));

CREATE POLICY "Preparators view their assigned preparations"
  ON public.order_preparations FOR SELECT
  USING (assigned_to = auth.uid() AND has_role(auth.uid(), 'preparator'::app_role));

CREATE POLICY "Preparators update their assigned preparations"
  ON public.order_preparations FOR UPDATE
  USING (assigned_to = auth.uid() AND has_role(auth.uid(), 'preparator'::app_role));

CREATE POLICY "Deny anon preparations"
  ON public.order_preparations AS RESTRICTIVE FOR ALL
  TO anon USING (false) WITH CHECK (false);

CREATE TRIGGER update_order_preparations_updated_at
  BEFORE UPDATE ON public.order_preparations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC reserve_order_stock
CREATE OR REPLACE FUNCTION public.reserve_order_stock(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_inv_id UUID;
  v_loc_id UUID;
  v_qty INTEGER;
  v_size TEXT;
  v_stock_level RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role)) THEN
    RETURN jsonb_build_object('error', 'FORBIDDEN');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ORDER_NOT_FOUND'); END IF;
  IF v_order.stock_reserved_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_reserved', true);
  END IF;

  SELECT id INTO v_loc_id FROM public.locations WHERE type = 'web' LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);
    v_size := v_item->>'size';
    SELECT id INTO v_inv_id FROM public.inventory WHERE product_id = (v_item->>'productId')::UUID LIMIT 1;
    IF v_inv_id IS NULL THEN CONTINUE; END IF;

    SELECT * INTO v_stock_level FROM public.stock_levels
      WHERE inventory_id = v_inv_id
        AND (location_id = v_loc_id OR v_loc_id IS NULL)
        AND (size IS NOT DISTINCT FROM v_size)
      LIMIT 1;

    IF v_stock_level.id IS NOT NULL THEN
      UPDATE public.stock_levels
        SET reserved = COALESCE(reserved, 0) + v_qty, updated_at = now()
        WHERE id = v_stock_level.id;
      INSERT INTO public.stock_history (inventory_id, location_id, size, quantity_before, quantity_after, action, created_by, note)
      VALUES (v_inv_id, v_stock_level.location_id, v_size, COALESCE(v_stock_level.reserved,0), COALESCE(v_stock_level.reserved,0) + v_qty, 'reservation', auth.uid(), 'Order ' || v_order.order_number);
    END IF;
  END LOOP;

  UPDATE public.orders SET stock_reserved_at = now() WHERE id = p_order_id;

  INSERT INTO public.order_preparations (order_id, status)
  VALUES (p_order_id, 'pending')
  ON CONFLICT (order_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC release_order_stock
CREATE OR REPLACE FUNCTION public.release_order_stock(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_inv_id UUID;
  v_loc_id UUID;
  v_qty INTEGER;
  v_size TEXT;
  v_stock_level RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role)) THEN
    RETURN jsonb_build_object('error', 'FORBIDDEN');
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND OR v_order.stock_reserved_at IS NULL THEN
    RETURN jsonb_build_object('success', true, 'noop', true);
  END IF;

  SELECT id INTO v_loc_id FROM public.locations WHERE type = 'web' LIMIT 1;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);
    v_size := v_item->>'size';
    SELECT id INTO v_inv_id FROM public.inventory WHERE product_id = (v_item->>'productId')::UUID LIMIT 1;
    IF v_inv_id IS NULL THEN CONTINUE; END IF;
    SELECT * INTO v_stock_level FROM public.stock_levels
      WHERE inventory_id = v_inv_id AND (location_id = v_loc_id OR v_loc_id IS NULL) AND (size IS NOT DISTINCT FROM v_size) LIMIT 1;
    IF v_stock_level.id IS NOT NULL THEN
      UPDATE public.stock_levels SET reserved = GREATEST(0, COALESCE(reserved,0) - v_qty), updated_at = now() WHERE id = v_stock_level.id;
    END IF;
  END LOOP;
  UPDATE public.orders SET stock_reserved_at = NULL WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC consume_order_stock (called on shipping)
CREATE OR REPLACE FUNCTION public.consume_order_stock(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_inv_id UUID;
  v_loc_id UUID;
  v_qty INTEGER;
  v_size TEXT;
  v_stock_level RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role)) THEN
    RETURN jsonb_build_object('error', 'FORBIDDEN');
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ORDER_NOT_FOUND'); END IF;
  IF v_order.stock_consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_consumed', true);
  END IF;

  SELECT id INTO v_loc_id FROM public.locations WHERE type = 'web' LIMIT 1;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);
    v_size := v_item->>'size';
    SELECT id INTO v_inv_id FROM public.inventory WHERE product_id = (v_item->>'productId')::UUID LIMIT 1;
    IF v_inv_id IS NULL THEN CONTINUE; END IF;
    SELECT * INTO v_stock_level FROM public.stock_levels
      WHERE inventory_id = v_inv_id AND (location_id = v_loc_id OR v_loc_id IS NULL) AND (size IS NOT DISTINCT FROM v_size) LIMIT 1;
    IF v_stock_level.id IS NOT NULL THEN
      UPDATE public.stock_levels
        SET quantity = GREATEST(0, COALESCE(quantity,0) - v_qty),
            reserved = GREATEST(0, COALESCE(reserved,0) - v_qty),
            updated_at = now()
        WHERE id = v_stock_level.id;
      INSERT INTO public.stock_history (inventory_id, location_id, size, quantity_before, quantity_after, action, created_by, note)
      VALUES (v_inv_id, v_stock_level.location_id, v_size, COALESCE(v_stock_level.quantity,0), GREATEST(0, COALESCE(v_stock_level.quantity,0) - v_qty), 'shipment', auth.uid(), 'Order ' || v_order.order_number);
    END IF;
  END LOOP;
  UPDATE public.orders SET stock_consumed_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Helper RPC: list users with a specific role + their email (admin-only)
CREATE OR REPLACE FUNCTION public.list_users_by_role(p_role app_role)
RETURNS TABLE(user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN QUERY
  SELECT ur.user_id, COALESCE(c.email, au.email)::TEXT
  FROM public.user_roles ur
  LEFT JOIN public.customers c ON c.user_id = ur.user_id
  LEFT JOIN auth.users au ON au.id = ur.user_id
  WHERE ur.role = p_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_users_by_role(app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_users_by_role(app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reserve_order_stock(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_order_stock(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.release_order_stock(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_order_stock(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_order_stock(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_order_stock(UUID) TO authenticated;
