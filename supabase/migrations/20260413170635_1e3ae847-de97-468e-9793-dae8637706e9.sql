-- Remove the overly permissive public SELECT policy on the base table
DROP POLICY IF EXISTS "Public can view design settings" ON public.design_settings;