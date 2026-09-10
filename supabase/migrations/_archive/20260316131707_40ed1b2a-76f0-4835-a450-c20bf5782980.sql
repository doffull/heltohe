
ALTER TABLE public.design_settings
  ADD COLUMN IF NOT EXISTS legal_company_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_company_form text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_capital text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_zip text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_siret text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_rcs text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_vat text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_director text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_rgpd_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_return_email text DEFAULT '';
