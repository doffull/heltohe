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

export interface PopupEventRow {
  id: string;
  campaign_id: string;
  event: 'view' | 'click' | 'dismiss' | 'convert' | string;
  session_id: string | null;
  url: string | null;
  created_at: string;
  device: DeviceKind | 'unknown';
  platform: PlatformKind | 'unknown';
  browser: string;
  standalone: boolean;
  /** Vrai quand le clic a réellement déclenché l'installation. */
  installed: boolean;
}

/**
 * Événements bruts des pop-ups « Installer l'app », enrichis du device.
 * Le filtrage (device / plateforme) se fait ensuite côté client.
 */
export function useInstallPopupEvents(days = 30) {
  return useQuery({
    queryKey: ['popup-campaigns', 'install-events', days],
    queryFn: async (): Promise<{ events: PopupEventRow[]; campaigns: { id: string; name: string }[] }> => {
      const { data: camps, error: campErr } = await supabase
        .from('popup_campaigns' as any)
        .select('id, name')
        .eq('type', 'install-app');
      if (campErr) throw campErr;

      const campaigns = ((camps || []) as any[]).map((c) => ({ id: c.id as string, name: c.name as string }));
      if (campaigns.length === 0) return { events: [], campaigns };

      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from('popup_events' as any)
        .select('id, campaign_id, event, session_id, url, meta, created_at')
        .in('campaign_id', campaigns.map((c) => c.id))
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20000);
      if (error) throw error;

      const events: PopupEventRow[] = ((data || []) as any[]).map((row) => {
        const meta = (row.meta || {}) as Record<string, unknown>;
        return {
          id: row.id,
          campaign_id: row.campaign_id,
          event: row.event,
          session_id: row.session_id,
          url: row.url,
          created_at: row.created_at,
          device: (meta.device as DeviceKind) || 'unknown',
          platform: (meta.platform as PlatformKind) || 'unknown',
          browser: (meta.browser as string) || 'unknown',
          standalone: meta.standalone === true,
          installed: meta.install === true,
        };
      });

      return { events, campaigns };
    },
    staleTime: 60_000,
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
