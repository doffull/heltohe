ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS icon_image text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'all';

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_visibility_check;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_visibility_check CHECK (visibility IN ('all','menu','site'));