-- Add CHECK constraint on cart_items quantity to prevent negative or zero values
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0 AND quantity <= 999);