CREATE OR REPLACE FUNCTION public.normalize_order_statuses()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT NULL THEN
    NEW.status := initcap(lower(btrim(NEW.status)));
  END IF;
  IF NEW.payment_status IS NOT NULL THEN
    NEW.payment_status := initcap(lower(btrim(NEW.payment_status)));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_order_statuses_trg ON public.orders;
CREATE TRIGGER normalize_order_statuses_trg
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.normalize_order_statuses();