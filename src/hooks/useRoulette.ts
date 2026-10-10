import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';

export type GameType = 'scratch' | 'wheel' | 'mystery' | 'flash';

export interface RouletteConfig {
  id: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  button_label: string;
  fab_label: string;
  cooldown_hours: number;
  reward_validity_days: number;
  require_email: boolean;
  game_type?: GameType;
}

export interface RouletteSegment {
  id: string;
  label: string;
  description: string;
  reward_type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'nothing';
  reward_value: number;
  min_purchase: number;
  max_discount: number | null;
  probability_weight: number;
  color: string;
  text_color: string;
  icon: string;
  code_prefix: string;
  sort_order: number;
  is_active: boolean;
  max_wins_per_day: number | null;
}

export interface SpinResult {
  success?: boolean;
  error?: string;
  spinId?: string;
  segmentId?: string;
  label?: string;
  description?: string;
  rewardType?: string;
  rewardValue?: number;
  code?: string;
  expiresAt?: string;
  nextAvailableAt?: string;
}

export function useRouletteConfig() {
  return useQuery({
    queryKey: ['roulette-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roulette_config_public' as any)
        .select('*')
        .eq('config_key', 'main')
        .maybeSingle();
      if (error) throw error;
      return data as unknown as RouletteConfig | null;
    },
  });
}

export function useRouletteSegments(includeInactive = false) {
  return useQuery({
    queryKey: ['roulette-segments', includeInactive],
    queryFn: async () => {
      // Admin contexts (includeInactive) read full table; public reads sanitized view.
      const source = includeInactive ? 'roulette_segments' : 'roulette_segments_public';
      let q = supabase.from(source as any).select('*').order('sort_order');
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as RouletteSegment[];
    },
  });
}

function assertRouletteWriteAllowed() {
  if (typeof window !== 'undefined' && window.location.hostname !== 'helvetica-mp.com') {
    throw new Error('Mode test : les tirages et modifications de roulette sont désactivés pour protéger la boutique.');
  }
}

export function useSpinRoulette() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email?: string) => {
      assertRouletteWriteAllowed();
      // Call edge function so the server can hash the client IP for anti-abuse
      const { data, error } = await supabase.functions.invoke('spin-roulette', {
        body: { email: email || null },
      });
      if (error) throw new Error(await edgeErrorMessage(error));
      const result = data as SpinResult;
      // Persist won code so checkout can auto-apply it
      if (result?.code) {
        try {
          localStorage.setItem(
            'roulette_reward_code',
            JSON.stringify({ code: result.code, expiresAt: result.expiresAt })
          );
        } catch { /* ignore */ }
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roulette-spins'] });
    },
  });
}

export function useUpdateRouletteConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<RouletteConfig>) => {
      assertRouletteWriteAllowed();
      const { error } = await supabase
        .from('roulette_config' as any)
        .update(patch as any)
        .eq('config_key', 'main');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roulette-config'] }),
  });
}

export function useUpsertSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (segment: Partial<RouletteSegment> & { id?: string }) => {
      assertRouletteWriteAllowed();
      if (segment.id) {
        const { id, ...rest } = segment;
        const { error } = await supabase
          .from('roulette_segments' as any)
          .update(rest as any)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('roulette_segments' as any).insert(segment as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roulette-segments'] }),
  });
}

export function useDeleteSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      assertRouletteWriteAllowed();
      const { error } = await supabase.from('roulette_segments' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roulette-segments'] }),
  });
}

export function useRouletteSpinsHistory(limit = 100) {
  return useQuery({
    queryKey: ['roulette-spins', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roulette_spins' as any)
        .select('*, roulette_segments(label, icon)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}
