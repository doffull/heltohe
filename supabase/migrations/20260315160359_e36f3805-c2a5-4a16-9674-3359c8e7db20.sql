
-- Function: auto-create inventory + stock_levels when a product is inserted
CREATE OR REPLACE FUNCTION public.auto_create_inventory_on_product_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory_id UUID;
  v_web_location_id UUID;
  v_size TEXT;
  v_nb_sizes INTEGER;
  v_qty_per_size INTEGER;
BEGIN
  -- Get the web/online location id
  SELECT id INTO v_web_location_id
  FROM public.locations
  WHERE type = 'web'
  LIMIT 1;

  -- If no web location exists, skip gracefully
  IF v_web_location_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if inventory already exists for this product (safety guard)
  IF EXISTS (SELECT 1 FROM public.inventory WHERE product_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Create the inventory entry
  INSERT INTO public.inventory (product_id, sku, name, channel, threshold)
  VALUES (NEW.id, NEW.sku, NEW.name, 'b2c', 10)
  RETURNING id INTO v_inventory_id;

  -- If the product has sizes, create one stock_level row per size
  IF NEW.sizes IS NOT NULL AND array_length(NEW.sizes, 1) > 0 THEN
    v_nb_sizes := array_length(NEW.sizes, 1);
    v_qty_per_size := GREATEST(0, FLOOR(COALESCE(NEW.stock, 0)::NUMERIC / v_nb_sizes)::INTEGER);

    FOREACH v_size IN ARRAY NEW.sizes LOOP
      INSERT INTO public.stock_levels (inventory_id, location_id, quantity, reserved, size)
      VALUES (v_inventory_id, v_web_location_id, v_qty_per_size, 0, v_size);
    END LOOP;
  ELSE
    -- No sizes: single global stock_level row
    INSERT INTO public.stock_levels (inventory_id, location_id, quantity, reserved)
    VALUES (v_inventory_id, v_web_location_id, COALESCE(NEW.stock, 0), 0);
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to the products table (AFTER INSERT)
CREATE TRIGGER trg_auto_create_inventory_on_product_insert
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_inventory_on_product_insert();
