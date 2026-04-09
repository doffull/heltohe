
-- Create checkout_config table
CREATE TABLE public.checkout_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL DEFAULT 'main' UNIQUE,
  shipping_home_price NUMERIC NOT NULL DEFAULT 6.50,
  shipping_relay_price NUMERIC NOT NULL DEFAULT 4.50,
  free_shipping_threshold NUMERIC NOT NULL DEFAULT 200,
  home_delivery_enabled BOOLEAN NOT NULL DEFAULT true,
  relay_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_methods JSONB NOT NULL DEFAULT '[{"key":"bank_transfer","label":"Virement bancaire","enabled":true},{"key":"check","label":"Chèque","enabled":false}]'::jsonb,
  checkout_message TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkout_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read checkout config
CREATE POLICY "Anyone can view checkout config"
ON public.checkout_config FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage checkout config"
ON public.checkout_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_checkout_config_updated_at
BEFORE UPDATE ON public.checkout_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config
INSERT INTO public.checkout_config (config_key) VALUES ('main');
