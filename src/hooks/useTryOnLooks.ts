import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface LookItem {
  productId: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string;
  size?: string | null;
  color?: string | null;
  family?: string | null;
}

export interface TryOnLook {
  id: string;
  title?: string | null;
  mannequinId?: string | null;
  baseProductId?: string | null;
  items: LookItem[];
  resultImage?: string | null;
  createdAt: string;
}

function dbToLook(d: any): TryOnLook {
  return {
    id: d.id,
    title: d.title,
    mannequinId: d.mannequin_id,
    baseProductId: d.base_product_id,
    items: Array.isArray(d.items) ? (d.items as LookItem[]) : [],
    resultImage: d.result_image,
    createdAt: d.created_at,
  };
}

export function useTryOnLooks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tryon-looks', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tryon_looks' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(dbToLook);
    },
  });
}

export function useSaveTryOnLook() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (look: {
      title?: string;
      mannequinId?: string | null;
      baseProductId?: string | null;
      items: LookItem[];
      resultImage?: string | null;
    }) => {
      if (!user) throw new Error('NOT_AUTHENTICATED');
      const { data, error } = await supabase
        .from('tryon_looks' as any)
        .insert({
          user_id: user.id,
          title: look.title || null,
          mannequin_id: look.mannequinId || null,
          base_product_id: look.baseProductId || null,
          items: look.items as any,
          result_image: look.resultImage || null,
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      return (data as any)?.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tryon-looks'] }),
  });
}

export function useDeleteTryOnLook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tryon_looks' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tryon-looks'] }),
  });
}
