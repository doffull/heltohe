import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NewsletterPopup {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  cta_label: string;
  image_url: string | null;
  display_trigger: 'on_load' | 'delay' | 'scroll_50' | 'exit_intent';
  delay_seconds: number;
  frequency_days: number;
  is_active: boolean;
  bg_color: string;
  text_color: string;
  sort_order: number;
}

export function useActiveNewsletterPopups() {
  return useQuery({
    queryKey: ['newsletter-popups', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_popups' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as NewsletterPopup[];
    },
  });
}

export function useAllNewsletterPopups() {
  return useQuery({
    queryKey: ['newsletter-popups', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_popups' as any)
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as NewsletterPopup[];
    },
  });
}

export function useUpsertNewsletterPopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (popup: Partial<NewsletterPopup> & { id?: string }) => {
      if (popup.id) {
        const { id, ...rest } = popup;
        const { error } = await supabase.from('newsletter_popups' as any).update(rest as any).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('newsletter_popups' as any).insert(popup as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['newsletter-popups'] }),
  });
}

export function useDeleteNewsletterPopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('newsletter_popups' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['newsletter-popups'] }),
  });
}

export interface SubscribeOpts {
  source?: 'sidebar' | 'popup' | 'roulette' | 'footer' | 'manual';
  popupId?: string;
  referrerPath?: string;
  sessionId?: string;
}

export async function subscribeToNewsletter(email: string, firstName?: string, opts: SubscribeOpts = {}) {
  // Double opt-in : la fonction serveur enregistre le contact et envoie l'e-mail de confirmation.
  const { data, error } = await supabase.functions.invoke('newsletter-subscribe', {
    body: {
      email,
      firstName: firstName || undefined,
      source: opts.source || 'site',
      popupId: opts.popupId || undefined,
      referrerPath: opts.referrerPath || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  // Mark popup view as converted if applicable
  if (opts.popupId && opts.sessionId) {
    await supabase.rpc('mark_popup_converted' as any, {
      p_popup_id: opts.popupId,
      p_session_id: opts.sessionId,
    });
  }
}

export async function recordPopupView(popupId: string, sessionId: string) {
  await supabase.from('newsletter_popup_views' as any).insert({ popup_id: popupId, session_id: sessionId } as any);
}

