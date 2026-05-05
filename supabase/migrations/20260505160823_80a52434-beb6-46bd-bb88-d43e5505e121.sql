-- 1. Logo customization columns on design_settings
ALTER TABLE public.design_settings
  ADD COLUMN IF NOT EXISTS logo_size integer DEFAULT 40,
  ADD COLUMN IF NOT EXISTS logo_background_shape text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS logo_background_color text DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_background_padding integer DEFAULT 8;

-- 2. Trigger to sanitize techwear_hero — replace null sub-fields with defaults so frontend never crashes
CREATE OR REPLACE FUNCTION public.sanitize_techwear_hero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_default jsonb := jsonb_build_object(
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
      jsonb_build_object('name', 'Black', 'hex', '#000000', 'image', '/assets/home/model-black.png')
    ),
    'defaultColor', 0,
    'imageFit', 'cover',
    'imagePosition', 'center',
    'showStats', true,
    'showColors', true,
    'showSizes', true,
    'showModelBadge', true
  );
BEGIN
  IF NEW.techwear_hero IS NULL THEN
    NEW.techwear_hero := v_default;
    RETURN NEW;
  END IF;
  -- Replace each null sub-key with defaults
  IF NEW.techwear_hero->'colorOptions' IS NULL OR jsonb_typeof(NEW.techwear_hero->'colorOptions') <> 'array' THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{colorOptions}', v_default->'colorOptions');
  END IF;
  IF NEW.techwear_hero->'stats' IS NULL OR jsonb_typeof(NEW.techwear_hero->'stats') <> 'array' THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{stats}', v_default->'stats');
  END IF;
  IF NEW.techwear_hero->'visibleSizes' IS NULL OR jsonb_typeof(NEW.techwear_hero->'visibleSizes') <> 'array' THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{visibleSizes}', v_default->'visibleSizes');
  END IF;
  IF NEW.techwear_hero->'modelBadge' IS NULL THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{modelBadge}', v_default->'modelBadge');
  END IF;
  IF NEW.techwear_hero->'ctaPrimary' IS NULL THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{ctaPrimary}', v_default->'ctaPrimary');
  END IF;
  IF NEW.techwear_hero->'ctaSecondary' IS NULL THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{ctaSecondary}', v_default->'ctaSecondary');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sanitize_techwear_hero_trg ON public.design_settings;
CREATE TRIGGER sanitize_techwear_hero_trg
  BEFORE INSERT OR UPDATE ON public.design_settings
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_techwear_hero();

-- 3. category_hero_settings table
CREATE TABLE IF NOT EXISTS public.category_hero_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL UNIQUE REFERENCES public.categories(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.category_hero_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled category hero"
  ON public.category_hero_settings FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins manage category hero"
  ON public.category_hero_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_category_hero_settings_updated_at
  BEFORE UPDATE ON public.category_hero_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();