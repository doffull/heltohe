import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';

export interface CrmContact {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  notes: string | null;
  source?: string | null;
  created_at: string;
}

export interface CrmConversation {
  id: string;
  contact_id: string;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  order_id: string | null;
  last_message_at: string;
  created_at: string;
}

export interface CrmMessage {
  id: string;
  conversation_id: string;
  sender_email: string;
  recipient_email: string;
  content: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
}

export interface MessagingConfig {
  id?: string;
  default_from_email: string | null;
  default_from_name: string | null;
  provider: string;
  signature: string | null;
}

export interface CrmMessageTemplate {
  id: string;
  name: string;
  category: string;
  subject: string | null;
  body: string;
  sort_order: number;
  is_active: boolean;
}

const db = supabase as any;

/* ---------------- Modèles de réponse ---------------- */

export function useCrmMessageTemplates() {
  return useQuery({
    queryKey: ['crm_message_templates'],
    queryFn: async (): Promise<CrmMessageTemplate[]> => {
      const { data, error } = await db
        .from('crm_message_templates')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as CrmMessageTemplate[];
    },
  });
}

export function useSaveCrmMessageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tpl: Partial<CrmMessageTemplate>) => {
      const payload = {
        name: (tpl.name || '').trim() || 'Modèle sans nom',
        category: tpl.category || 'general',
        subject: tpl.subject?.trim() || null,
        body: tpl.body || '',
        sort_order: tpl.sort_order ?? 0,
        is_active: tpl.is_active ?? true,
      };
      if (tpl.id) {
        const { error } = await db.from('crm_message_templates').update(payload).eq('id', tpl.id);
        if (error) throw error;
        return tpl.id;
      }
      const { data, error } = await db
        .from('crm_message_templates')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm_message_templates'] }),
  });
}

export function useDeleteCrmMessageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('crm_message_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm_message_templates'] }),
  });
}


/* ---------------- Contacts ---------------- */

export function useCrmContacts() {
  return useQuery({
    queryKey: ['crm_contacts'],
    queryFn: async (): Promise<CrmContact[]> => {
      const all: CrmContact[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await db.from('crm_contacts').select('*')
          .order('created_at', { ascending: false }).order('id', { ascending: false })
          .range(offset, offset + 999);
        if (error) throw error;
        all.push(...((data || []) as CrmContact[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });
}

export function useSaveCrmContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Partial<CrmContact>) => {
      const payload = {
        email: (contact.email || '').trim().toLowerCase(),
        name: contact.name?.trim() || null,
        phone: contact.phone?.trim() || null,
        notes: contact.notes?.trim() || null,
      };
      if (contact.id) {
        const { error } = await db.from('crm_contacts').update(payload).eq('id', contact.id);
        if (error) throw error;
        return contact.id;
      }
      const { data, error } = await db
        .from('crm_contacts')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm_contacts'] }),
  });
}

export function useDeleteCrmContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('crm_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm_contacts'] });
      qc.invalidateQueries({ queryKey: ['crm_conversations'] });
    },
  });
}

/* ---------------- Clients (site + WooCommerce) ---------------- */

export interface CrmImportableCustomer {
  email: string;
  name: string | null;
  phone: string | null;
  source: string;
  total_orders: number | null;
  total_spent: number | null;
  inCrm: boolean;
}

/** Liste tous les clients (table customers) avec l'info « déjà présent dans le CRM ». */
export function useCrmCustomers() {
  return useQuery({
    queryKey: ['crm_importable_customers'],
    queryFn: async (): Promise<CrmImportableCustomer[]> => {
      const fetchAll = async (table: 'customers' | 'crm_contacts', columns: string, sort: boolean) => {
        const all: any[] = [];
        for (let offset = 0; ; offset += 1000) {
          let query = db.from(table).select(columns);
          if (sort) query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
          else query = query.order('id', { ascending: false });
          const { data, error } = await query.range(offset, offset + 999);
          if (error) throw error;
          all.push(...(data || []));
          if (!data || data.length < 1000) break;
        }
        return all;
      };
      const [customers, contacts] = await Promise.all([
        fetchAll('customers', 'email, first_name, last_name, phone, source, orders_count, total_spent, created_at', true),
        fetchAll('crm_contacts', 'id, email', false),
      ]);
      const existing = new Set(
        ((contacts || []) as { email: string }[]).map((c) => (c.email || '').toLowerCase()),
      );
      return ((customers || []) as any[])
        .filter((c) => !!c.email)
        .map((c) => {
          const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
          return {
            email: String(c.email).toLowerCase(),
            name: name || null,
            phone: c.phone || null,
            source: c.source || 'site',
            total_orders: c.orders_count ?? null,
            total_spent: c.total_spent ?? null,
            inCrm: existing.has(String(c.email).toLowerCase()),
          };
        });
    },
  });
}

/** Ajoute (ou met à jour) des clients dans le carnet de contacts CRM. */
export function useImportCustomersToCrm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customers: CrmImportableCustomer[]) => {
      const rows = customers
        .filter((c) => !!c.email)
        .map((c) => ({
          email: c.email.toLowerCase(),
          name: c.name || null,
          phone: c.phone || null,
          source: c.source === 'woocommerce' ? 'woocommerce' : 'customer',
        }));
      if (!rows.length) return 0;
      const { error } = await db.from('crm_contacts').upsert(rows, { onConflict: 'email' });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm_contacts'] });
      qc.invalidateQueries({ queryKey: ['crm_importable_customers'] });
    },
  });
}

/* ---------------- Conversations ---------------- */

export function useCrmConversations() {
  return useQuery({
    queryKey: ['crm_conversations'],
    queryFn: async (): Promise<CrmConversation[]> => {
      const { data, error } = await db
        .from('crm_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CrmConversation[];
    },
  });
}

export function useCrmMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['crm_messages', conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<CrmMessage[]> => {
      const { data, error } = await db
        .from('crm_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as CrmMessage[];
    },
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contact_id: string; subject: string }) => {
      const { data, error } = await db
        .from('crm_conversations')
        .insert({ contact_id: input.contact_id, subject: input.subject || '(sans objet)' })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm_conversations'] }),
  });
}

export function useUpdateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; subject?: string }) => {
      const { error } = await db.from('crm_conversations').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm_conversations'] }),
  });
}

export function useSendCrmMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { conversationId: string; content: string; to: string; subject: string }) => {
      const { data, error } = await supabase.functions.invoke('crm-send-message', {
        body: {
          conversation_id: input.conversationId,
          content: input.content,
          to: input.to,
          subject: input.subject,
        },
      });
      if (error) throw new Error(await edgeErrorMessage(error));
      return data as { sent: boolean; warning?: string };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['crm_messages', vars.conversationId] });
      qc.invalidateQueries({ queryKey: ['crm_conversations'] });
    },
  });
}

/* ---------------- Config ---------------- */

export function useMessagingConfig() {
  return useQuery({
    queryKey: ['messaging_config'],
    queryFn: async (): Promise<MessagingConfig> => {
      const { data, error } = await db
        .from('messaging_config')
        .select('*')
        .eq('config_key', 'main')
        .maybeSingle();
      if (error) throw error;
      return (data || { provider: 'resend', default_from_email: null, default_from_name: null, signature: null }) as MessagingConfig;
    },
  });
}

export function useSaveMessagingConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: MessagingConfig) => {
      const { error } = await db.from('messaging_config').upsert(
        {
          config_key: 'main',
          default_from_email: config.default_from_email || null,
          default_from_name: config.default_from_name || null,
          provider: config.provider || 'resend',
          signature: config.signature || null,
        },
        { onConflict: 'config_key' },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messaging_config'] }),
  });
}
