
-- notification_config table
CREATE TABLE public.notification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE DEFAULT 'main',
  notify_on_identity_verified boolean NOT NULL DEFAULT false,
  notify_on_payment_verified boolean NOT NULL DEFAULT false,
  notify_on_all_validated boolean NOT NULL DEFAULT true,
  notification_channels jsonb NOT NULL DEFAULT '{"email": true, "sms": false}'::jsonb,
  sms_from_number text DEFAULT '',
  email_templates jsonb NOT NULL DEFAULT '{
    "identity_verified": {"subject": "Commande {{order_number}} - Identité vérifiée", "body": "Bonjour {{customer_name}},\n\nVotre identité a été vérifiée pour la commande {{order_number}}.\n\nCordialement,\nL''équipe LVTK6"},
    "payment_verified": {"subject": "Commande {{order_number}} - Paiement confirmé", "body": "Bonjour {{customer_name}},\n\nLe paiement de votre commande {{order_number}} a été confirmé.\n\nCordialement,\nL''équipe LVTK6"},
    "all_validated": {"subject": "Commande {{order_number}} - Commande validée", "body": "Bonjour {{customer_name}},\n\nVotre commande {{order_number}} est entièrement validée et sera expédiée prochainement.\n\nCordialement,\nL''équipe LVTK6"}
  }'::jsonb,
  sms_templates jsonb NOT NULL DEFAULT '{
    "identity_verified": "LVTK6: Votre identité est vérifiée pour la commande {{order_number}}.",
    "payment_verified": "LVTK6: Paiement confirmé pour la commande {{order_number}}.",
    "all_validated": "LVTK6: Commande {{order_number}} validée ! Expédition prochaine."
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification config"
ON public.notification_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_notification_config_updated_at
BEFORE UPDATE ON public.notification_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- notification_log table
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  channel text NOT NULL,
  notification_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  recipient text NOT NULL,
  error_message text,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification log"
ON public.notification_log FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
