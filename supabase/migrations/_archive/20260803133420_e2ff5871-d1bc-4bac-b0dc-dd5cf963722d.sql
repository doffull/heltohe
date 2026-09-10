CREATE TABLE public.payplug_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  payplug_payment_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'created',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  is_live boolean NOT NULL DEFAULT false,
  failure_message text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payplug_transactions TO authenticated;
GRANT ALL ON public.payplug_transactions TO service_role;

ALTER TABLE public.payplug_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payplug transactions"
ON public.payplug_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payplug_transactions_updated_at
BEFORE UPDATE ON public.payplug_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_payplug_transactions_order ON public.payplug_transactions(order_id);