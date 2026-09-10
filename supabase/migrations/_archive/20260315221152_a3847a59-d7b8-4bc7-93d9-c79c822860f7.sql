
-- Fix the generate_category_slug trigger: correct the translate() character mapping
-- Source chars (32): à â ä é è ê ë ï î ô ù û ü ÿ ç À Â Ä É È Ê Ë Ï Î Ô Ù Û Ü Ÿ Ç = 30 chars
-- Corrected target must match exactly
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
    -- Normalize accented characters one by one using REPLACE for reliability
    base_slug := lower(NEW.title);
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
    base_slug := replace(base_slug, 'ù', 'u');
    base_slug := replace(base_slug, 'û', 'u');
    base_slug := replace(base_slug, 'ü', 'u');
    base_slug := replace(base_slug, 'ÿ', 'y');
    base_slug := replace(base_slug, 'ç', 'c');
    -- Remove non-alphanumeric except spaces and hyphens
    base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
    -- Replace spaces with hyphens
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    -- Trim leading/trailing hyphens
    base_slug := trim(both '-' from base_slug);
  END IF;

  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'categorie';
  END IF;

  candidate_slug := base_slug;

  -- Ensure uniqueness by appending numeric suffix
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
