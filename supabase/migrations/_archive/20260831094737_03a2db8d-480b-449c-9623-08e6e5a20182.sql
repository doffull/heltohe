-- Clients : unicité e-mail + user_id optionnel
ALTER TABLE public.customers ALTER COLUMN user_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique ON public.customers (lower(email));
ALTER TABLE public.customers ADD CONSTRAINT customers_email_key UNIQUE (email);

-- Traçabilité WooCommerce
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS wc_id BIGINT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'site';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS orders_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS wc_created_at TIMESTAMPTZ;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wc_id BIGINT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'site';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wc_created_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS orders_wc_id_idx ON public.orders (wc_id);
CREATE INDEX IF NOT EXISTS customers_wc_id_idx ON public.customers (wc_id);

-- Configuration WooCommerce
CREATE TABLE IF NOT EXISTS public.woocommerce_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE DEFAULT 'main',
  store_url TEXT,
  consumer_key TEXT,
  consumer_secret TEXT,
  sync_customers BOOLEAN NOT NULL DEFAULT true,
  sync_orders BOOLEAN NOT NULL DEFAULT true,
  sync_stats BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  store_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.woocommerce_config TO authenticated;
GRANT ALL ON public.woocommerce_config TO service_role;
ALTER TABLE public.woocommerce_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "woocommerce_config_admin_all" ON public.woocommerce_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_woocommerce_config_updated_at BEFORE UPDATE ON public.woocommerce_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Statistiques WooCommerce
CREATE TABLE IF NOT EXISTS public.woocommerce_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'month',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.woocommerce_stats TO authenticated;
GRANT ALL ON public.woocommerce_stats TO service_role;
ALTER TABLE public.woocommerce_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "woocommerce_stats_admin_all" ON public.woocommerce_stats
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_woocommerce_stats_updated_at BEFORE UPDATE ON public.woocommerce_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();