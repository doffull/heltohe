-- Defense-in-depth RESTRICTIVE SELECT policies for authenticated users

CREATE POLICY "Restrict admin_config reads to admins"
ON public.admin_config
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Restrict colissimo_bordereaux reads to admins"
ON public.colissimo_bordereaux
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Restrict notification_log reads to admins"
ON public.notification_log
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));