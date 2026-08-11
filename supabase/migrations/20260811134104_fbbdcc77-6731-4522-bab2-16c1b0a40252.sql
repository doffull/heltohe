ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT '50% 50%',
  ADD COLUMN IF NOT EXISTS cover_zoom numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cover_bg text;