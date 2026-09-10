CREATE OR REPLACE FUNCTION public.uppercase_product_subtitle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.subtitle IS NOT NULL THEN
    NEW.subtitle := upper(btrim(NEW.subtitle));
    IF NEW.subtitle = '' THEN
      NEW.subtitle := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_uppercase_subtitle ON public.products;
CREATE TRIGGER products_uppercase_subtitle
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.uppercase_product_subtitle();

UPDATE public.products SET subtitle = upper(btrim(subtitle)) WHERE subtitle IS NOT NULL AND subtitle <> upper(btrim(subtitle));