import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  type: string;
  value: number;
  minPurchase: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
}

function dbToPromo(db: Record<string, unknown>): PromoCode {
  return {
    id: db.id as string,
    code: db.code as string,
    description: (db.description as string) || undefined,
    type: db.type as string,
    value: Number(db.value),
    minPurchase: Number(db.min_purchase) || 0,
    maxDiscount: db.max_discount ? Number(db.max_discount) : undefined,
    usageLimit: (db.usage_limit as number) || undefined,
    usageCount: (db.usage_count as number) || 0,
    isActive: db.is_active as boolean,
    startsAt: (db.starts_at as string) || undefined,
    expiresAt: (db.expires_at as string) || undefined,
  };
}

export function usePromoCodes() {
  return useQuery({
    queryKey: ['admin-promos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d) => dbToPromo(d as Record<string, unknown>));
    },
  });
}

export function useCreatePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (promo: Omit<PromoCode, 'id' | 'usageCount'>) => {
      const { error } = await supabase.from('promo_codes').insert({
        code: promo.code,
        description: promo.description || null,
        type: promo.type as any,
        value: promo.value,
        min_purchase: promo.minPurchase,
        max_discount: promo.maxDiscount || null,
        usage_limit: promo.usageLimit || null,
        is_active: promo.isActive,
        starts_at: promo.startsAt || null,
        expires_at: promo.expiresAt || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promos'] }),
  });
}

export function useUpdatePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...promo }: PromoCode) => {
      const { error } = await supabase.from('promo_codes').update({
        code: promo.code,
        description: promo.description || null,
        type: promo.type as any,
        value: promo.value,
        min_purchase: promo.minPurchase,
        max_discount: promo.maxDiscount || null,
        usage_limit: promo.usageLimit || null,
        is_active: promo.isActive,
        starts_at: promo.startsAt || null,
        expires_at: promo.expiresAt || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promos'] }),
  });
}

export function useDeletePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promo_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promos'] }),
  });
}
