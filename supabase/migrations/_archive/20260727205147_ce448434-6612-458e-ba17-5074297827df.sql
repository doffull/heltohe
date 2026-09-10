
ALTER TABLE public.design_settings
  ADD COLUMN IF NOT EXISTS security_overlay jsonb NOT NULL DEFAULT jsonb_build_object(
    'enabled', true,
    'text_mode', 'brand',
    'custom_text', 'PROTECTED',
    'opacity', 0.05,
    'angle', -30,
    'density', 60,
    'font_size', 10,
    'color', 'auto',
    'show_timestamp', true,
    'disable_for_admin', true,
    'printscreen_blur_enabled', true,
    'printscreen_blur_ms', 800
  ),
  ADD COLUMN IF NOT EXISTS product_grid_layout text NOT NULL DEFAULT 'minimal';
