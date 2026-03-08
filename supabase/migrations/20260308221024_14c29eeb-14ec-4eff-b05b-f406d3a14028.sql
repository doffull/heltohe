ALTER TABLE design_settings
  ADD COLUMN IF NOT EXISTS site_name text DEFAULT 'Mon Site',
  ADD COLUMN IF NOT EXISTS site_tagline text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT '';