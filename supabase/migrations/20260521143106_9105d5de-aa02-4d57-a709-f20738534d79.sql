ALTER TABLE public.design_settings
ADD COLUMN IF NOT EXISTS global_product_sizes jsonb NOT NULL DEFAULT '["XS","S","M","L","XL","XXL","XXXL"]'::jsonb;