-- 1. Slug normalization: always sanitize, even when a slug is supplied
CREATE OR REPLACE FUNCTION public.generate_category_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  base_slug TEXT;
  candidate_slug TEXT;
  counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    base_slug := lower(NEW.slug);
  ELSE
    base_slug := lower(NEW.title);
  END IF;

  base_slug := replace(base_slug, 'à', 'a');
  base_slug := replace(base_slug, 'â', 'a');
  base_slug := replace(base_slug, 'ä', 'a');
  base_slug := replace(base_slug, 'é', 'e');
  base_slug := replace(base_slug, 'è', 'e');
  base_slug := replace(base_slug, 'ê', 'e');
  base_slug := replace(base_slug, 'ë', 'e');
  base_slug := replace(base_slug, 'ï', 'i');
  base_slug := replace(base_slug, 'î', 'i');
  base_slug := replace(base_slug, 'ô', 'o');
  base_slug := replace(base_slug, 'ö', 'o');
  base_slug := replace(base_slug, 'ù', 'u');
  base_slug := replace(base_slug, 'û', 'u');
  base_slug := replace(base_slug, 'ü', 'u');
  base_slug := replace(base_slug, 'ÿ', 'y');
  base_slug := replace(base_slug, 'ç', 'c');
  base_slug := replace(base_slug, '&', '-');
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '[\s-]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'categorie';
  END IF;

  candidate_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.categories
    WHERE slug = candidate_slug
      AND id IS DISTINCT FROM NEW.id
  ) LOOP
    counter := counter + 1;
    candidate_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := candidate_slug;
  RETURN NEW;
END;
$function$;

-- 2. Re-normalize existing category slugs (fires the trigger above)
UPDATE public.categories SET slug = NULL;

-- 3. Deduplicate category pages: keep the one matching the category slug, else the oldest
WITH ranked AS (
  SELECT p.id,
         row_number() OVER (
           PARTITION BY p.category_id
           ORDER BY (p.slug = c.slug) DESC, jsonb_array_length(COALESCE(p.sections,'[]'::jsonb)) DESC, p.created_at
         ) AS rn
  FROM public.pages p
  JOIN public.categories c ON c.id = p.category_id
  WHERE p.category_id IS NOT NULL
)
DELETE FROM public.pages WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 4. One page per category
CREATE UNIQUE INDEX IF NOT EXISTS pages_category_id_unique
  ON public.pages (category_id) WHERE category_id IS NOT NULL;

-- 5. Auto-create page on category insert
CREATE OR REPLACE FUNCTION public.auto_create_category_page()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.pages (title, slug, type, category_id, is_published, sections, meta_title, meta_description, seo_keywords)
  VALUES (
    NEW.title,
    NEW.slug,
    'category',
    NEW.id,
    true,
    '[]'::jsonb,
    NEW.meta_title,
    NEW.meta_description,
    NEW.seo_keywords
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 6. Keep the page in sync when the category is renamed / re-slugged
CREATE OR REPLACE FUNCTION public.sync_category_page()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_page_id UUID;
  v_slug TEXT;
  v_counter INTEGER := 1;
BEGIN
  SELECT id INTO v_page_id FROM public.pages WHERE category_id = NEW.id;

  v_slug := NEW.slug;
  WHILE EXISTS (
    SELECT 1 FROM public.pages
    WHERE slug = v_slug AND (v_page_id IS NULL OR id <> v_page_id)
  ) LOOP
    v_counter := v_counter + 1;
    v_slug := NEW.slug || '-' || v_counter;
  END LOOP;

  IF v_page_id IS NULL THEN
    INSERT INTO public.pages (title, slug, type, category_id, is_published, sections, meta_title, meta_description, seo_keywords)
    VALUES (NEW.title, v_slug, 'category', NEW.id, true, '[]'::jsonb, NEW.meta_title, NEW.meta_description, NEW.seo_keywords);
  ELSE
    UPDATE public.pages
       SET title = NEW.title,
           slug = v_slug,
           type = 'category',
           meta_title = COALESCE(NEW.meta_title, meta_title),
           meta_description = COALESCE(NEW.meta_description, meta_description),
           seo_keywords = COALESCE(NEW.seo_keywords, seo_keywords),
           updated_at = now()
     WHERE id = v_page_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_category_page_trigger ON public.categories;
CREATE TRIGGER sync_category_page_trigger
  AFTER UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_category_page();

-- 7. Delete the page when the category is deleted
CREATE OR REPLACE FUNCTION public.delete_category_page()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.pages WHERE category_id = OLD.id AND type = 'category';
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS delete_category_page_trigger ON public.categories;
CREATE TRIGGER delete_category_page_trigger
  BEFORE DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_category_page();

REVOKE EXECUTE ON FUNCTION public.generate_category_slug() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_create_category_page() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_category_page() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_category_page() FROM anon, authenticated, public;

-- 8. Backfill: create the missing pages for existing categories
INSERT INTO public.pages (title, slug, type, category_id, is_published, sections, meta_title, meta_description, seo_keywords)
SELECT c.title, c.slug, 'category', c.id, true, '[]'::jsonb, c.meta_title, c.meta_description, c.seo_keywords
FROM public.categories c
WHERE NOT EXISTS (SELECT 1 FROM public.pages p WHERE p.category_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.pages p2 WHERE p2.slug = c.slug);