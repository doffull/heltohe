ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sold_out_badge boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sold_out_label text;