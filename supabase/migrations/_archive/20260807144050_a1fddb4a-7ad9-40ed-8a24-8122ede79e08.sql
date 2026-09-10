ALTER TABLE public.products ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';
UPDATE public.products SET categories = ARRAY[category] WHERE (categories IS NULL OR array_length(categories,1) IS NULL) AND category IS NOT NULL AND category <> '';
CREATE INDEX IF NOT EXISTS products_categories_gin ON public.products USING gin (categories);