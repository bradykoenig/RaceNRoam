
CREATE OR REPLACE FUNCTION public.delete_cancelled_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    DELETE FROM public.orders WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_cancelled_orders ON public.orders;
CREATE TRIGGER trg_delete_cancelled_orders
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.delete_cancelled_orders();
