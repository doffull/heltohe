ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

CREATE TABLE IF NOT EXISTS public.customer_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  provider_id TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.customer_email_log TO authenticated;
GRANT ALL ON public.customer_email_log TO service_role;
ALTER TABLE public.customer_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read email log" ON public.customer_email_log;
CREATE POLICY "Admins can read email log" ON public.customer_email_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS customer_email_log_email_idx ON public.customer_email_log (customer_email, created_at DESC);