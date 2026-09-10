
-- Header preset fields in design_settings
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS header_preset text DEFAULT 'classic';
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS header_bg_color text DEFAULT '';
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS header_text_color text DEFAULT '';
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS header_fixed boolean DEFAULT true;

-- Sub-categories support
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES categories(id) ON DELETE SET NULL;
