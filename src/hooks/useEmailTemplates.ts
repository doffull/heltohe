import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  is_active: boolean;
}

/** Modèles proposés par défaut si la table est vide. */
export const DEFAULT_TEMPLATES: Omit<EmailTemplate, 'id'>[] = [
  {
    template_key: 'order_confirmation',
    name: 'Confirmation de commande',
    subject: 'Votre commande {{orderNumber}} est confirmée',
    html_body:
      '<p>Bonjour {{prenom}},</p><p>Merci pour votre commande <strong>{{orderNumber}}</strong> d\'un montant de {{total}} €.</p><p>Nous préparons votre colis et vous préviendrons dès son expédition.</p><p>L\'équipe HELVETICA MOUNTAIN PIONEERS</p>',
    text_body: null,
    is_active: true,
  },
  {
    template_key: 'payment_received',
    name: 'Paiement reçu',
    subject: 'Paiement reçu pour la commande {{orderNumber}}',
    html_body:
      '<p>Bonjour {{prenom}},</p><p>Nous avons bien reçu votre paiement de {{total}} € pour la commande <strong>{{orderNumber}}</strong>.</p>',
    text_body: null,
    is_active: true,
  },
  {
    template_key: 'order_shipped',
    name: 'Commande expédiée',
    subject: 'Votre commande {{orderNumber}} est expédiée',
    html_body:
      '<p>Bonjour {{prenom}},</p><p>Votre colis est parti ! Numéro de suivi : <strong>{{trackingNumber}}</strong>.</p><p><a href="{{trackingUrl}}">Suivre mon colis</a></p>',
    text_body: null,
    is_active: true,
  },
  {
    template_key: 'order_delivered',
    name: 'Commande livrée',
    subject: 'Votre commande {{orderNumber}} a été livrée',
    html_body:
      '<p>Bonjour {{prenom}},</p><p>Votre commande <strong>{{orderNumber}}</strong> a été livrée. Bonne découverte !</p>',
    text_body: null,
    is_active: true,
  },
  {
    template_key: 'custom',
    name: 'Message libre',
    subject: 'Un message de HELVETICA MOUNTAIN PIONEERS',
    html_body: '<p>Bonjour {{prenom}},</p><p>...</p>',
    text_body: null,
    is_active: true,
  },
];

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as EmailTemplate[];
    },
  });
}

export function useSaveEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tpl: Partial<EmailTemplate> & { template_key: string; name: string }) => {
      const { error } = await supabase.from('email_templates').upsert(
        {
          template_key: tpl.template_key,
          name: tpl.name,
          subject: tpl.subject ?? '',
          html_body: tpl.html_body ?? '',
          is_active: tpl.is_active ?? true,
        },
        { onConflict: 'template_key' },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
  });
}

export function useSeedEmailTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('email_templates')
        .upsert(DEFAULT_TEMPLATES, { onConflict: 'template_key', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
  });
}

export interface SendCustomEmailInput {
  to: string | string[];
  subject?: string;
  html?: string;
  templateKey?: string;
  variables?: Record<string, string>;
  orderId?: string;
}

export function useSendCustomEmail() {
  return useMutation({
    mutationFn: async (input: SendCustomEmailInput) => {
      const { data, error } = await supabase.functions.invoke('send-custom-email', { body: input });
      if (error) {
        const details =
          typeof (error as { context?: { text?: () => Promise<string> } }).context?.text === 'function'
            ? await (error as { context: { text: () => Promise<string> } }).context.text()
            : error.message;
        throw new Error(details);
      }
      return data as { ok: boolean; sent: number; failed: number };
    },
  });
}
