import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrackingKeyStatus {
  configured: boolean;
  source: 'database' | 'env' | null;
  last4: string | null;
  updatedAt: string | null;
  webhookConfigured: boolean;
  webhookUpdatedAt: string | null;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('tracking-key', { body });
  if (error) {
    // Récupère le message métier renvoyé par la fonction (400/403…)
    const ctx = (error as unknown as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const payload = await ctx.json().catch(() => null);
      if (payload?.error) throw new Error(payload.error);
    }
    throw new Error(error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

/** Statut (masqué) de la clé de suivi La Poste / Colissimo. */
export function useTrackingKeyStatus() {
  return useQuery({
    queryKey: ['tracking_key_status'],
    queryFn: () => call<TrackingKeyStatus>({ action: 'status' }),
    staleTime: 1000 * 30,
  });
}

export function useSaveTrackingKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (apiKey: string) => call<{ ok: true; last4: string; message: string }>({ action: 'set', apiKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracking_key_status'] }),
  });
}

export function useDeleteTrackingKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call<{ ok: true }>({ action: 'delete' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracking_key_status'] }),
  });
}

export function useTestTrackingKey() {
  return useMutation({
    mutationFn: () => call<{ ok: true; message: string }>({ action: 'test' }),
  });
}

export function usePollTrackingNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call<{ ok: true; result: unknown }>({ action: 'poll_now' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tracking-events'] }),
  });
}

export function useWebhookToken() {
  const qc = useQueryClient();
  const reveal = useMutation({ mutationFn: () => call<{ token: string }>({ action: 'reveal_webhook' }) });
  const rotate = useMutation({
    mutationFn: () => call<{ token: string }>({ action: 'rotate_webhook' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracking_key_status'] }),
  });
  return { reveal, rotate };
}

export function carrierWebhookUrl(token?: string | null): string {
  const base = import.meta.env.VITE_SUPABASE_URL || '';
  return `${base}/functions/v1/carrier-tracking-webhook${token ? `?token=${token}` : '?token=VOTRE_JETON'}`;
}
