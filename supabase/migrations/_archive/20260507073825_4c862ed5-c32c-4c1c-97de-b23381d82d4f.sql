ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS model_height text,
  ADD COLUMN IF NOT EXISTS model_size_worn text,
  ADD COLUMN IF NOT EXISTS model_name text;