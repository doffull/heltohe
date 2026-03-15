-- Fix: link the "Femme" page to the Femme category
UPDATE public.pages
SET category_id = 'be35aabf-3efe-46fe-bdb7-e3ea7cd63f67',
    type = 'category',
    updated_at = now()
WHERE slug = 'femme'
  AND category_id IS NULL;