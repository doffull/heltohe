import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryRecord {
  id: string;
  title: string;
  image?: string;
  sortOrder: number;
  displaySize: string;
  coverMode: string;
  parentId?: string | null;
}

function dbToCat(db: Record<string, unknown>): CategoryRecord {
  return {
    id: db.id as string,
    title: db.title as string,
    image: (db.image as string) || undefined,
    sortOrder: (db.sort_order as number) || 0,
    displaySize: (db.display_size as string) || 'medium',
    coverMode: (db.cover_mode as string) || 'cover',
    parentId: (db.parent_id as string) || null,
  };
}

export function useCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []).map((d) => dbToCat(d as Record<string, unknown>));
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: Omit<CategoryRecord, 'id'>) => {
      const { error } = await supabase.from('categories').insert({
        title: cat.title,
        image: cat.image || null,
        sort_order: cat.sortOrder,
        display_size: cat.displaySize || 'medium',
        cover_mode: cat.coverMode || 'cover',
        parent_id: cat.parentId || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...cat }: CategoryRecord) => {
      const { error } = await supabase.from('categories').update({
        title: cat.title,
        image: cat.image || null,
        sort_order: cat.sortOrder,
        display_size: cat.displaySize || 'medium',
        cover_mode: cat.coverMode || 'cover',
        parent_id: cat.parentId || null,
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
}
