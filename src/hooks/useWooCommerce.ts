import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WooConfig {
  store_url: string;
  consumer_key: string;
  has_secret: boolean;
  sync_customers: boolean;
  sync_orders: boolean;
  sync_stats: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  store_info: {
    store_name?: string | null;
    wc_version?: string | null;
    wp_version?: string | null;
    currency?: string | null;
  } | null;
}

export interface WooSyncResult {
  customers: number;
  orders: number;
  ordersInProgress: number;
  products: number;
  variations: number;
  categories: number;
  stats: string[];
  errors: string[];
  incremental: boolean;
  since: string | null;
  status: 'success' | 'partial' | 'failed';
  correlationId?: string;
  error?: string;
}

async function callWoo<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('woocommerce-import', { body });
  if (error) throw new Error(error.message);
  if ((data as any)?.error && !(data as any)?.status) throw new Error((data as any).error);
  return data as T;
}

export function useWooConfig() {
  return useQuery({
    queryKey: ['woo-config'],
    queryFn: () => callWoo<WooConfig>({ mode: 'get-config' }),
  });
}

export function useSaveWooConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      storeUrl: string;
      consumerKey: string;
      consumerSecret?: string;
      syncCustomers?: boolean;
      syncOrders?: boolean;
      syncStats?: boolean;
      syncProducts?: boolean;
      syncStock?: boolean;
      syncCategories?: boolean;
    }) => callWoo<{ saved: boolean }>({ mode: 'save-config', ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['woo-config'] }),
  });
}

export function useWooPing() {
  return useMutation({
    mutationFn: (input: { storeUrl?: string; consumerKey?: string; consumerSecret?: string } = {}) =>
      callWoo<{ success?: boolean; error?: string; storeInfo?: Record<string, unknown> | null }>({
        mode: 'ping',
        ...input,
      }),
  });
}

export function useWooSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      incremental?: boolean;
      syncCustomers?: boolean;
      syncOrders?: boolean;
      syncStats?: boolean;
      syncProducts?: boolean;
      syncStock?: boolean;
      syncCategories?: boolean;
      statsPeriod?: string;
    }) => callWoo<WooSyncResult>({ mode: 'sync', ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['woo-config'] });
      qc.invalidateQueries({ queryKey: ['woo-stats'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      qc.invalidateQueries({ queryKey: ['wp-sync-logs'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['crm_contacts'] });
      qc.invalidateQueries({ queryKey: ['crm_importable_customers'] });
    },
  });
}

export interface WooStatRow {
  report: string;
  period: string;
  data: { value: unknown };
  fetched_at: string;
}

/** Statistiques déjà rapatriées (lecture locale, sans appel WooCommerce). */
export function useWooStats(period = 'month') {
  return useQuery({
    queryKey: ['woo-stats', period],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('woocommerce_stats')
        .select('*')
        .eq('period', period);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((row: WooStatRow) => {
        map[row.report] = { value: row.data?.value, fetched_at: row.fetched_at };
      });
      return map;
    },
  });
}

export function useRefreshWooStats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (period: string) => callWoo<{ period: string; errors: string[] }>({ mode: 'stats', statsPeriod: period }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['woo-stats'] }),
  });
}
