import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductStyle {
  id: string;
  name: string;
  description?: string;
  image?: string;
  productIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function dbToStyle(db: Record<string, unknown>): ProductStyle {
  return {
    id: db.id as string,
    name: db.name as string,
    description: (db.description as string) || undefined,
    image: (db.image as string) || undefined,
    productIds: (db.product_ids as string[]) || [],
    isActive: db.is_active as boolean,
    createdAt: db.created_at as string,
    updatedAt: db.updated_at as string,
  };
}

export function useProductStyles() {
  return useQuery({
    queryKey: ['product_styles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_styles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(d => dbToStyle(d as Record<string, unknown>));
    },
  });
}

export function useCreateProductStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (style: Omit<ProductStyle, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('product_styles')
        .insert({
          name: style.name,
          description: style.description || null,
          image: style.image || null,
          product_ids: style.productIds,
          is_active: style.isActive,
        })
        .select()
        .single();
      if (error) throw error;
      return dbToStyle(data as Record<string, unknown>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_styles'] }),
  });
}

export function useUpdateProductStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...style }: Partial<ProductStyle> & { id: string }) => {
      const { error } = await supabase
        .from('product_styles')
        .update({
          name: style.name,
          description: style.description ?? null,
          image: style.image ?? null,
          product_ids: style.productIds,
          is_active: style.isActive,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_styles'] }),
  });
}

export function useDeleteProductStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_styles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_styles'] }),
  });
}
