
-- Add size and color columns to stock_levels
ALTER TABLE public.stock_levels
  ADD COLUMN IF NOT EXISTS size TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL;

-- Drop existing unique constraint if any on (inventory_id, location_id)
DO $$
BEGIN
  -- Try to drop common constraint names
  BEGIN
    ALTER TABLE public.stock_levels DROP CONSTRAINT IF EXISTS stock_levels_inventory_id_location_id_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.stock_levels DROP CONSTRAINT IF EXISTS unique_stock_level;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Create unique constraint on (inventory_id, location_id, size, color) using COALESCE for NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_levels_inv_loc_size_color
  ON public.stock_levels (inventory_id, location_id, COALESCE(size, ''), COALESCE(color, ''));
