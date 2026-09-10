ALTER TABLE public.design_settings
ADD COLUMN IF NOT EXISTS techwear_hero JSONB NOT NULL DEFAULT jsonb_build_object(
  'enabled', false,
  'productId', null,
  'modelBadge', jsonb_build_object('line1', 'MODEL', 'line2', '0.1.2'),
  'ctaPrimary', jsonb_build_object('label', 'SHOP NOW', 'href', '/boutique'),
  'ctaSecondary', jsonb_build_object('label', 'EXPLORE', 'href', '/boutique'),
  'stats', jsonb_build_array(
    jsonb_build_object('label', 'PRICE', 'value', 75),
    jsonb_build_object('label', 'DURABILITY', 'value', 90),
    jsonb_build_object('label', 'FASHION', 'value', 85)
  ),
  'visibleSizes', jsonb_build_array('M', 'L'),
  'defaultSize', 'M',
  'colorOptions', jsonb_build_array(
    jsonb_build_object('name', 'Black', 'hex', '#000000', 'image', '/assets/home/model-black.png'),
    jsonb_build_object('name', 'White', 'hex', '#ffffff', 'image', '/assets/home/model-white.png'),
    jsonb_build_object('name', 'Gray',  'hex', '#888888', 'image', '/assets/home/model-gray.png')
  ),
  'defaultColor', 0,
  'imageFit', 'cover',
  'imagePosition', 'center',
  'showStats', true,
  'showColors', true,
  'showSizes', true,
  'showModelBadge', true
);