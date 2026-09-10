ALTER TABLE public.products ALTER COLUMN weight_grams SET DEFAULT 1500;
UPDATE public.products SET weight_grams = 1500 WHERE weight_grams IS NULL;