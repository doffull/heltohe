
-- Add SEO and slug fields to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS seo_keywords text;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_unique ON public.categories (slug) WHERE slug IS NOT NULL;

-- Auto-generate slug from title on insert/update
CREATE OR REPLACE FUNCTION public.generate_category_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(
      regexp_replace(
        regexp_replace(
          translate(NEW.title, 'àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ', 'aaaeeeeiioouuycAAARRREEEIIOOUUUYC'),
          '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_category_slug
  BEFORE INSERT OR UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_category_slug();

-- Backfill slugs for existing categories
UPDATE public.categories SET slug = lower(
  regexp_replace(
    regexp_replace(
      translate(title, 'àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ', 'aaaeeeeiioouuycAAARRREEEIIOOUUUYC'),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
) WHERE slug IS NULL;
