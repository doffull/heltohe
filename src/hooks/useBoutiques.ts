import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Boutique {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode?: string | null;
  country: string;
  latitude: number;
  longitude: number;
  image?: string | null;
  sortOrder: number;
  isActive: boolean;
}

function dbToBoutique(d: any): Boutique {
  return {
    id: d.id,
    name: d.name,
    address: d.address,
    city: d.city,
    postalCode: d.postal_code,
    country: d.country,
    latitude: Number(d.latitude),
    longitude: Number(d.longitude),
    image: d.image,
    sortOrder: d.sort_order ?? 0,
    isActive: d.is_active ?? true,
  };
}

export function useBoutiques(includeInactive = false) {
  return useQuery({
    queryKey: ['boutiques', includeInactive],
    queryFn: async () => {
      let q = supabase.from('boutiques' as any).select('*').order('sort_order', { ascending: true });
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(dbToBoutique);
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpsertBoutique() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: Partial<Boutique> & { id?: string }) => {
      const payload: any = {
        name: b.name,
        address: b.address,
        city: b.city,
        postal_code: b.postalCode || null,
        country: b.country || 'France',
        latitude: b.latitude,
        longitude: b.longitude,
        image: b.image || null,
        sort_order: b.sortOrder ?? 0,
        is_active: b.isActive ?? true,
      };
      if (b.id) {
        const { error } = await supabase.from('boutiques' as any).update(payload).eq('id', b.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('boutiques' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boutiques'] }),
  });
}

export function useDeleteBoutique() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('boutiques' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boutiques'] }),
  });
}
