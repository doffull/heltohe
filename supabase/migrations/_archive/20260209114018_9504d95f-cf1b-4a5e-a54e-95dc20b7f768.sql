
ALTER TABLE banners ADD COLUMN IF NOT EXISTS display_delay integer DEFAULT 2000;
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS category_columns integer DEFAULT 4;
