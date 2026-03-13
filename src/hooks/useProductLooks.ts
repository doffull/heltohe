import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductLook {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  productIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function dbToLook(db: Record<string, unknown>): ProductLook {
  return {
    id: db.id as string,
    name: db.name as string,
    description: (db.description as string) || undefined,
    coverImage: (db.cover_image as string) || undefined,
    productIds: (db.product_ids as string[]) || [],
    isActive: db.is_active as boolean,
    createdAt: db.created_at as string,
    updatedAt: db.updated_at as string,
  };
}

export function useProductLooks() {
  return useQuery({
    queryKey: ['product_looks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_looks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(d => dbToLook(d as Record<string, unknown>));
    },
  });
}

export function useCreateProductLook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (look: Omit<ProductLook, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('product_looks')
        .insert({
          name: look.name,
          description: look.description || null,
          cover_image: look.coverImage || null,
          product_ids: look.productIds,
          is_active: look.isActive,
        })
        .select()
        .single();
      if (error) throw error;
      return dbToLook(data as Record<string, unknown>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_looks'] }),
  });
}

export function useUpdateProductLook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...look }: Partial<ProductLook> & { id: string }) => {
      const { error } = await supabase
        .from('product_looks')
        .update({
          name: look.name,
          description: look.description ?? null,
          cover_image: look.coverImage ?? null,
          product_ids: look.productIds,
          is_active: look.isActive,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_looks'] }),
  });
}

export function useDeleteProductLook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_looks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_looks'] }),
  });
}
