CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX crm_contacts_email_key ON public.crm_contacts (lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm contacts" ON public.crm_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_conversations_contact_idx ON public.crm_conversations (contact_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_conversations TO authenticated;
GRANT ALL ON public.crm_conversations TO service_role;
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm conversations" ON public.crm_conversations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
  sender_email text NOT NULL,
  recipient_email text NOT NULL,
  content text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_messages_conversation_idx ON public.crm_messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_messages TO authenticated;
GRANT ALL ON public.crm_messages TO service_role;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crm messages" ON public.crm_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.messaging_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE DEFAULT 'main',
  default_from_email text,
  default_from_name text,
  provider text NOT NULL DEFAULT 'resend',
  signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messaging_config TO authenticated;
GRANT ALL ON public.messaging_config TO service_role;
ALTER TABLE public.messaging_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage messaging config" ON public.messaging_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER crm_conversations_updated_at BEFORE UPDATE ON public.crm_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER messaging_config_updated_at BEFORE UPDATE ON public.messaging_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.touch_crm_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.crm_conversations
     SET last_message_at = NEW.created_at, updated_at = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER crm_messages_touch_conversation AFTER INSERT ON public.crm_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_crm_conversation();

INSERT INTO public.messaging_config (config_key, provider) VALUES ('main', 'resend')
ON CONFLICT (config_key) DO NOTHING;