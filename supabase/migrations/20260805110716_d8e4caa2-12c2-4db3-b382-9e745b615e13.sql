ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hover_image TEXT;

ALTER TABLE public.design_settings ADD COLUMN IF NOT EXISTS collab_settings JSONB NOT NULL DEFAULT jsonb_build_object(
  'sizes', '[]'::jsonb,
  'colors', '[]'::jsonb,
  'page', jsonb_build_object(
    'title', 'COLLAB',
    'subtitle', 'HELVETICA MOUNTAIN PIONEERS X PEGASHOES',
    'intro', '',
    'heroImage', '',
    'ctaLabel', '',
    'ctaHref', '',
    'metaTitle', '',
    'metaDescription', ''
  ),
  'animation', jsonb_build_object(
    'hoverEffect', 'fade',
    'hoverDuration', 500,
    'hoverEnabled', true
  ),
  'layout', jsonb_build_object(
    'columnsMobile', 2,
    'columnsTablet', 2,
    'columnsDesktop', 3,
    'swatchStyle', 'round',
    'showSizes', true,
    'badgePosition', 'bottom-right'
  )
);

ALTER TABLE public.design_settings ADD COLUMN IF NOT EXISTS shop_hover_effect JSONB NOT NULL DEFAULT jsonb_build_object(
  'enabled', true,
  'effect', 'fade',
  'duration', 500
);