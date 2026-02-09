
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS top_banner jsonb DEFAULT '{"enabled": false, "text": "", "bgColor": "#000000", "textColor": "#ffffff"}'::jsonb;
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS footer_logo text DEFAULT '';
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT '';
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS header_nav_items jsonb DEFAULT '[]'::jsonb;
