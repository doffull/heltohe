-- 1. PayPal configuration (public, non-secret values only)
CREATE TABLE public.paypal_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text NOT NULL UNIQUE DEFAULT 'main',
  environment text NOT NULL DEFAULT 'sandbox',
  client_id_sandbox text,
  client_id_live text,
  enabled boolean NOT NULL DEFAULT false,
  enable_paypal_button boolean NOT NULL DEFAULT true,
  enable_pay_later boolean NOT NULL DEFAULT true,
  enable_card_fields boolean NOT NULL DEFAULT true,
  enable_wallets boolean NOT NULL DEFAULT true,
  enable_venmo boolean NOT NULL DEFAULT false,
  enable_messaging boolean NOT NULL DEFAULT true,
  messaging_placements jsonb NOT NULL DEFAULT '{"product":true,"cart":true,"checkout":true,"home":false}'::jsonb,
  button_style jsonb NOT NULL DEFAULT '{"layout":"vertical","color":"gold","shape":"rect","label":"paypal","height":45,"tagline":false}'::jsonb,
  brand_name text,
  currency text NOT NULL DEFAULT 'EUR',
  locale text NOT NULL DEFAULT 'fr_FR',
  intent text NOT NULL DEFAULT 'capture',
  webhook_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.paypal_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paypal_config TO authenticated;
GRANT ALL ON public.paypal_config TO service_role;

ALTER TABLE public.paypal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PayPal config is publicly readable"
  ON public.paypal_config FOR SELECT
  USING (true);

CREATE POLICY "Admins manage PayPal config"
  ON public.paypal_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_paypal_config_updated_at
  BEFORE UPDATE ON public.paypal_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.paypal_config (config_key, brand_name) VALUES ('main', 'LVTK6');

-- 2. PayPal transactions
CREATE TABLE public.paypal_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  paypal_order_id text NOT NULL,
  capture_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  status text NOT NULL DEFAULT 'created',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  funding_source text,
  payer_email text,
  payer_name text,
  refunded_amount numeric NOT NULL DEFAULT 0,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX paypal_transactions_paypal_order_id_key ON public.paypal_transactions (paypal_order_id);
CREATE INDEX paypal_transactions_order_id_idx ON public.paypal_transactions (order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paypal_transactions TO authenticated;
GRANT ALL ON public.paypal_transactions TO service_role;

ALTER TABLE public.paypal_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read PayPal transactions"
  ON public.paypal_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'auditor'::app_role));

CREATE POLICY "Admins manage PayPal transactions"
  ON public.paypal_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_paypal_transactions_updated_at
  BEFORE UPDATE ON public.paypal_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. PayPal webhook events log
CREATE TABLE public.paypal_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text,
  event_type text NOT NULL,
  resource_id text,
  verification_status text,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX paypal_webhook_events_type_idx ON public.paypal_webhook_events (event_type, created_at DESC);

GRANT SELECT ON public.paypal_webhook_events TO authenticated;
GRANT ALL ON public.paypal_webhook_events TO service_role;

ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read PayPal webhook events"
  ON public.paypal_webhook_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'auditor'::app_role));