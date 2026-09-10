ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS limited_edition_label text,
  ADD COLUMN IF NOT EXISTS limited_edition_color text,
  ADD COLUMN IF NOT EXISTS limited_edition_text_color text,
  ADD COLUMN IF NOT EXISTS limited_edition_position text;