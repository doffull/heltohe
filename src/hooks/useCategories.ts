import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryRecord {
  id: string;
  title: string;
  slug?: string;
  image?: string;
  sortOrder: number;
  displaySize: string;
  coverMode: string;
  parentId?: string | null;
  metaTitle?: string;
  metaDescription?: string;
  seoKeywords?: string;
}

function dbToCat(db: Record<string, unknown>): CategoryRecord {
  return {
    id: db.id as string,
    title: db.title as string,
    slug: (db.slug as string) || undefined,
    image: (db.image as string) || undefined,
    sortOrder: (db.sort_order as number) || 0,
    displaySize: (db.display_size as string) || 'medium',
    coverMode: (db.cover_mode as string) || 'cover',
    parentId: (db.parent_id as string) || null,
    metaTitle: (db.meta_title as string) || undefined,
    metaDescription: (db.meta_description as string) || undefined,
    seoKeywords: (db.seo_keywords as string) || undefined,
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
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: Omit<CategoryRecord, 'id'>) => {
      const buildPayload = (slug: string | null) => ({
        title: cat.title,
        slug: slug || null,
        image: cat.image || null,
        sort_order: cat.sortOrder,
        display_size: cat.displaySize || 'medium',
        cover_mode: cat.coverMode || 'cover',
        parent_id: cat.parentId || null,
        meta_title: cat.metaTitle || null,
        meta_description: cat.metaDescription || null,
        seo_keywords: cat.seoKeywords || null,
      } as any);

      const { error } = await supabase.from('categories').insert(buildPayload(cat.slug || null));

      // Handle duplicate slug: retry with suffixed slug
      if (error?.code === '23505' && error.message?.includes('slug')) {
        const baseSlug = cat.slug || cat.title.toLowerCase().replace(/\s+/g, '-');
        // Fetch existing slugs to find next available suffix
        const { data: existing } = await supabase.from('categories').select('slug');
        const slugSet = new Set((existing || []).map((c: any) => c.slug));
        let suffix = 2;
        let candidate = `${baseSlug}-${suffix}`;
        while (slugSet.has(candidate)) { suffix++; candidate = `${baseSlug}-${suffix}`; }

        const { error: retryError } = await supabase.from('categories').insert(buildPayload(candidate));
        if (retryError) throw retryError;
        return;
      }

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
        slug: cat.slug || null,
        image: cat.image || null,
        sort_order: cat.sortOrder,
        display_size: cat.displaySize || 'medium',
        cover_mode: cat.coverMode || 'cover',
        parent_id: cat.parentId || null,
        meta_title: cat.metaTitle || null,
        meta_description: cat.metaDescription || null,
        seo_keywords: cat.seoKeywords || null,
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
