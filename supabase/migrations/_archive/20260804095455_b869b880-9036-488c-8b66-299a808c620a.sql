CREATE TABLE public.crm_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  subject text,
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_message_templates TO authenticated;
GRANT ALL ON public.crm_message_templates TO service_role;

ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view message templates"
  ON public.crm_message_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert message templates"
  ON public.crm_message_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update message templates"
  ON public.crm_message_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete message templates"
  ON public.crm_message_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_crm_message_templates_updated_at
  BEFORE UPDATE ON public.crm_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_message_templates (name, category, subject, body, sort_order) VALUES
('Accusé de réception', 'general', 'Re: {{objet}}',
'Bonjour {{prenom}},

Merci pour votre message. Nous l''avons bien reçu et notre équipe revient vers vous dans les plus brefs délais (sous 24h ouvrées).

Bien à vous,
{{signature}}', 1),
('Suivi de commande', 'commande', 'Suivi de votre commande {{numero_commande}}',
'Bonjour {{prenom}},

Votre commande {{numero_commande}} est en cours d''acheminement.
Numéro de suivi {{transporteur}} : {{numero_suivi}}

Vous pouvez suivre votre colis directement depuis votre espace client.

Bien à vous,
{{signature}}', 2),
('Retour / échange', 'sav', 'Votre demande de retour',
'Bonjour {{prenom}},

Nous avons pris en compte votre demande concernant la commande {{numero_commande}}.
Merci de nous retourner l''article dans son emballage d''origine, étiquettes intactes, sous 14 jours.

Dès réception, nous procédons à l''échange ou au remboursement.

Bien à vous,
{{signature}}', 3),
('Clôture de conversation', 'general', 'Re: {{objet}}',
'Bonjour {{prenom}},

Nous considérons votre demande comme résolue et clôturons cet échange. N''hésitez pas à nous réécrire si besoin.

Merci de votre confiance,
{{signature}}', 4);