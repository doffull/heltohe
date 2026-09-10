DROP POLICY IF EXISTS "PayPal config is publicly readable" ON public.paypal_config;

CREATE POLICY "Admins read PayPal config"
ON public.paypal_config FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP VIEW IF EXISTS public.paypal_config_public;

CREATE VIEW public.paypal_config_public AS
SELECT
  config_key,
  enabled,
  enable_paypal_button,
  enable_pay_later,
  enable_card_fields,
  enable_wallets,
  enable_venmo,
  enable_messaging,
  messaging_placements,
  button_style,
  brand_name,
  currency,
  locale,
  intent,
  environment,
  CASE WHEN environment = 'live' THEN client_id_live ELSE client_id_sandbox END AS client_id
FROM public.paypal_config;

GRANT SELECT ON public.paypal_config_public TO anon, authenticated;