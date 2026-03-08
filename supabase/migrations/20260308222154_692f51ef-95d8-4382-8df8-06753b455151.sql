ALTER TABLE design_settings
  ADD COLUMN IF NOT EXISTS sidebar_reappear_delay integer DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS slider_height text DEFAULT '100vh',
  ADD COLUMN IF NOT EXISTS site_spacing text DEFAULT 'compact',
  ADD COLUMN IF NOT EXISTS category_layout jsonb DEFAULT '{"preset":"portrait","columns":4,"aspectRatio":"3/4","gap":"md"}';