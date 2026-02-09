
-- Colonnes categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_size text DEFAULT 'medium';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS cover_mode text DEFAULT 'cover';

-- Colonnes orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier text;
