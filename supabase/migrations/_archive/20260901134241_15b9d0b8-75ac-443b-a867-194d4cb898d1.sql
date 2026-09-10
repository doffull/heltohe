CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  ip_hash text,
  succeeded boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_attempts_email_created_idx
  ON public.password_reset_attempts (email, created_at DESC);

GRANT ALL ON public.password_reset_attempts TO service_role;

ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;