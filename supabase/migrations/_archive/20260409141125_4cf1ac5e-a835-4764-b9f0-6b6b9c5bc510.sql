-- Fix security: restrict promo_codes SELECT to only validate specific codes, not list all
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON public.promo_codes;

-- Fix security: prevent privilege escalation on user_roles
-- Add restrictive policy that blocks non-admin INSERT
CREATE POLICY "Block non-admin role inserts"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));