CREATE TABLE IF NOT EXISTS public.payment_gateway_secrets (
  gateway text PRIMARY KEY,
  secret_key text NOT NULL,
  last4 text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT ALL ON public.payment_gateway_secrets TO service_role;

ALTER TABLE public.payment_gateway_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payment_gateway_secrets FROM anon, authenticated;