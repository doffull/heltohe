UPDATE public.products SET limited_edition = true WHERE lower(trim(category)) = 'collab' AND limited_edition IS NOT TRUE;

CREATE OR REPLACE FUNCTION public.default_collab_limited_edition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF lower(trim(coalesce(NEW.category, ''))) = 'collab' AND NEW.limited_edition IS NOT TRUE THEN
    NEW.limited_edition := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS default_collab_limited_edition_trg ON public.products;
CREATE TRIGGER default_collab_limited_edition_trg
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.default_collab_limited_edition();