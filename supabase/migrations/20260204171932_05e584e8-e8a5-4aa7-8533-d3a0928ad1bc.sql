-- Fix the newsletter insert policy to be more restrictive
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletters;

-- Replace with a policy that requires a valid email format (basic check)
CREATE POLICY "Anyone can subscribe to newsletter with valid email"
  ON public.newsletters FOR INSERT
  WITH CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');