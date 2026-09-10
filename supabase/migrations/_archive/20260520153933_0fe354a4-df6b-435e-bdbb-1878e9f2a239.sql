
CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email text)
RETURNS TABLE(user_id uuid, email text, roles app_role[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    au.id AS user_id,
    au.email::text AS email,
    COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::app_role[]) AS roles
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  WHERE lower(au.email) = lower(trim(p_email))
  GROUP BY au.id, au.email
  LIMIT 1;
END;
$$;
