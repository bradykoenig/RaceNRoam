-- Remove any other admin roles, keeping only bvess308@gmail.com
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id <> 'd64e2481-4ab0-4c35-88b9-7691354af0a4';

-- Enforce that only bvess308@gmail.com can hold the admin role
CREATE OR REPLACE FUNCTION public.enforce_single_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NEW.role = 'admin' THEN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
    IF v_email IS DISTINCT FROM 'bvess308@gmail.com' THEN
      RAISE EXCEPTION 'Only bvess308@gmail.com may be granted the admin role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_admin_trigger ON public.user_roles;
CREATE TRIGGER enforce_single_admin_trigger
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_admin();