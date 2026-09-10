
-- Allow admins to delete orders
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete customers
CREATE POLICY "Admins can delete customers"
ON public.customers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
