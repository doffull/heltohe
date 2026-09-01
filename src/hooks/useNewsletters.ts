import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  firstName?: string;
  isSubscribed: boolean;
  subscribedAt: string;
  createdAt: string;
  confirmedAt?: string | null;
  source?: string | null;
}

function dbToSub(db: Record<string, unknown>): NewsletterSubscriber {
  return {
    id: db.id as string,
    email: db.email as string,
    firstName: (db.first_name as string) || undefined,
    isSubscribed: !!db.is_subscribed,
    subscribedAt: (db.subscribed_at as string) || (db.created_at as string),
    createdAt: db.created_at as string,
    confirmedAt: (db.confirmed_at as string) || null,
    source: (db.source as string) || null,
  };
}

/** Statut lisible d'un abonné (double opt-in). */
export function subscriberStatus(s: NewsletterSubscriber): 'confirmed' | 'pending' | 'unsubscribed' {
  if (s.isSubscribed && s.confirmedAt) return 'confirmed';
  if (!s.isSubscribed && s.confirmedAt) return 'unsubscribed';
  return s.isSubscribed ? 'confirmed' : 'pending';
}

export function useNewsletters() {
  return useQuery({
    queryKey: ['admin-newsletters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d) => dbToSub(d as Record<string, unknown>));
    },
  });
}

export function useDeleteNewsletter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('newsletters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-newsletters'] }),
  });
}

/** Désabonne / réabonne manuellement un contact depuis l'admin. */
export function useToggleNewsletterSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, subscribe }: { id: string; subscribe: boolean }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('newsletters')
        .update(
          subscribe
            ? { is_subscribed: true, subscribed_at: now, confirmed_at: now, unsubscribed_at: null }
            : { is_subscribed: false, unsubscribed_at: now },
        )
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-newsletters'] }),
  });
}

/** Inscription publique : déclenche l'e-mail de confirmation (double opt-in). */
export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: async (input: {
      email: string;
      firstName?: string;
      source?: string;
      popupId?: string;
      referrerPath?: string;
      honeypot?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('newsletter-subscribe', {
        body: { ...input, origin: window.location.origin },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { ok: boolean; status: 'pending' | 'already' | 'suppressed' };
    },
  });
}

// ---------------------------------------------------------------- Campagnes

export interface NewsletterCampaign {
  id: string;
  subject: string;
  preheader?: string | null;
  content: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  status: string;
  sentAt?: string | null;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

function dbToCampaign(db: Record<string, unknown>): NewsletterCampaign {
  return {
    id: db.id as string,
    subject: db.subject as string,
    preheader: (db.preheader as string) || null,
    content: (db.content as string) || '',
    imageUrl: (db.image_url as string) || null,
    ctaLabel: (db.cta_label as string) || null,
    ctaUrl: (db.cta_url as string) || null,
    status: (db.status as string) || 'draft',
    sentAt: (db.sent_at as string) || null,
    sentCount: Number(db.sent_count || 0),
    failedCount: Number(db.failed_count || 0),
    createdAt: db.created_at as string,
  };
}

export function useNewsletterCampaigns() {
  return useQuery({
    queryKey: ['newsletter-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d) => dbToCampaign(d as Record<string, unknown>));
    },
  });
}

export function useSaveNewsletterCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<NewsletterCampaign>) => {
      const payload = {
        subject: c.subject || 'Sans objet',
        preheader: c.preheader || null,
        content: c.content || '',
        image_url: c.imageUrl || null,
        cta_label: c.ctaLabel || null,
        cta_url: c.ctaUrl || null,
      };
      if (c.id) {
        const { error } = await supabase.from('newsletter_campaigns').update(payload).eq('id', c.id);
        if (error) throw error;
        return c.id;
      }
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] }),
  });
}

export function useDeleteNewsletterCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('newsletter_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] }),
  });
}

export function useSendNewsletterCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, testEmail }: { campaignId: string; testEmail?: string }) => {
      const { data, error } = await supabase.functions.invoke('newsletter-campaign', {
        body: { campaignId, testEmail, origin: window.location.origin },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { ok: boolean; sent?: number; failed?: number; total?: number; test?: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsletter-campaigns'] });
      qc.invalidateQueries({ queryKey: ['admin-newsletters'] });
    },
  });
}
