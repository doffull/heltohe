UPDATE public.products
SET attributes = COALESCE(attributes, '{}'::jsonb) || jsonb_build_object('Isolation', 'Duvet synthétique')
WHERE NOT (COALESCE(attributes, '{}'::jsonb) ? 'Isolation');