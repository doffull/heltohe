
-- Fix RLS policy for categories to include explicit WITH CHECK
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also update the generate_category_slug trigger to handle duplicate slugs
-- by appending a numeric suffix if needed
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
  -- If slug is provided and non-empty, use it as base
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    base_slug := NEW.slug;
  ELSE
    base_slug := lower(
      regexp_replace(
        regexp_replace(
          translate(NEW.title, 'àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ', 'aaaeeeeiioouuycAAARRREEEIIOOUUUYC'),
          '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    );
  END IF;

  candidate_slug := base_slug;

  -- Check for uniqueness and append suffix if needed
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
