import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GeminiKeyStatus {
  configured: boolean;
  source: 'database' | 'env' | null;
  last4: string | null;
  updatedAt: string | null;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-keys', { body });
  if (error) {
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

/** Statut masqué de la clé Gemini enregistrée. */
export function useGeminiKeyStatus() {
  return useQuery({
    queryKey: ['gemini_key_status'],
    queryFn: () => call<GeminiKeyStatus>({ action: 'status' }),
    staleTime: 30_000,
  });
}

export function useSaveGeminiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { apiKey: string; model?: string }) =>
      call<{ ok: true; last4: string; message: string }>({ action: 'set', ...vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gemini_key_status'] }),
  });
}

export function useDeleteGeminiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call<{ ok: true }>({ action: 'delete' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gemini_key_status'] }),
  });
}

/** Teste un modèle (clé enregistrée, ou clé saisie non encore sauvegardée). */
export function useTestAiModel() {
  return useMutation({
    mutationFn: (vars: { model: string; apiKey?: string }) =>
      call<{ ok: true; message: string; via: string }>({ action: 'test', ...vars }),
  });
}
