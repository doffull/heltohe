import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceInfo, type DeviceKind, type PlatformKind } from '@/lib/deviceInfo';
import type { PopupCampaign } from '@/types/popups';


function mapRow(row: any): PopupCampaign {
  return {
    ...row,
    layers: Array.isArray(row.layers) ? row.layers : [],
    background: row.background || {},
    targeting: row.targeting || {},
  } as PopupCampaign;
}

export function useActivePopupCampaigns() {
  return useQuery({
    queryKey: ['popup-campaigns', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('popup_campaigns' as any)
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    staleTime: 60_000,
  });
}

export function useAllPopupCampaigns() {
  return useQuery({
    queryKey: ['popup-campaigns', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('popup_campaigns' as any)
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapRow);
    },
  });
}

export function useUpsertPopupCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: Partial<PopupCampaign> & { id?: string }) => {
      const payload: any = { ...campaign };
      delete payload.created_at;
      delete payload.updated_at;
      if (campaign.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from('popup_campaigns' as any).update(rest).eq('id', id);
        if (error) throw error;
        return campaign.id;
      }
      const { data, error } = await supabase
        .from('popup_campaigns' as any)
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return (data as any)?.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['popup-campaigns'] }),
  });
}

export function useDeletePopupCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('popup_campaigns' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['popup-campaigns'] }),
  });
}

export function usePopupStats() {
  return useQuery({
    queryKey: ['popup-campaigns', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('popup_events' as any)
        .select('campaign_id, event')
        .limit(20000);
      if (error) throw error;
      const map: Record<string, { view: number; click: number; dismiss: number; convert: number }> = {};
      (data || []).forEach((row: any) => {
        const s = (map[row.campaign_id] ||= { view: 0, click: 0, dismiss: 0, convert: 0 });
        if (row.event in s) (s as any)[row.event] += 1;
      });
      return map;
    },
  });
}

const SESSION_KEY = 'hmp_popup_session';
export function getPopupSessionId() {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return 'anon';
  }
}

export async function trackPopupEvent(
  campaignId: string,
  event: 'view' | 'click' | 'dismiss' | 'convert',
  meta: Record<string, unknown> = {},
) {
  try {
    // Le device est joint à chaque événement pour permettre le filtrage
    // par appareil / plateforme (notamment iOS) dans l'admin.
    const info = getDeviceInfo();
    await supabase.from('popup_events' as any).insert({
      campaign_id: campaignId,
      event,
      session_id: getPopupSessionId(),
      url: typeof window !== 'undefined' ? window.location.pathname : null,
      meta: { ...info, ...meta },
    } as any);

  } catch {
    /* analytics must never break UX */
  }
}
