ALTER TABLE public.design_settings
  ADD COLUMN IF NOT EXISTS colissimo_sender_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS colissimo_sender_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS colissimo_sender_zip text DEFAULT '',
  ADD COLUMN IF NOT EXISTS colissimo_sender_city text DEFAULT '';