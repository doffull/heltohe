
-- Create admin_config table for sensitive admin-only settings
CREATE TABLE IF NOT EXISTS public.admin_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE DEFAULT 'main',
  admin_notification_email text,
  colissimo_sender_name text DEFAULT '',
  colissimo_sender_address text DEFAULT '',
  colissimo_sender_zip text DEFAULT '',
  colissimo_sender_city text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS — admin only
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin config"
  ON public.admin_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing sensitive data from design_settings to admin_config
INSERT INTO public.admin_config (config_key, admin_notification_email, colissimo_sender_name, colissimo_sender_address, colissimo_sender_zip, colissimo_sender_city)
SELECT
  'main',
  admin_notification_email,
  colissimo_sender_name,
  colissimo_sender_address,
  colissimo_sender_zip,
  colissimo_sender_city
FROM public.design_settings
WHERE settings_key = 'main'
ON CONFLICT (config_key) DO NOTHING;

-- Null out the sensitive fields from design_settings (they stay in schema for now but are cleared)
UPDATE public.design_settings
SET
  admin_notification_email = NULL,
  colissimo_sender_name = '',
  colissimo_sender_address = '',
  colissimo_sender_zip = '',
  colissimo_sender_city = ''
WHERE settings_key = 'main';

-- Add updated_at trigger
CREATE OR REPLACE TRIGGER admin_config_updated_at
  BEFORE UPDATE ON public.admin_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
