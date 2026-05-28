import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PageSection {
  id: string;
  type: 'hero' | 'image' | 'video' | 'slider' | 'title' | 'subtitle' | 'text' | 'products' | 'categories' | 'popup_button' | 'banner';
  content: Record<string, any>;
  order: number;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  type: 'custom' | 'category';
  categoryId: string | null;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  seoKeywords: string | null;
  sections: PageSection[];
  menuLink: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: any): Page {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    type: row.type,
    categoryId: row.category_id,
    isPublished: row.is_published,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    seoKeywords: row.seo_keywords,
    sections: (row.sections as PageSection[]) || [],
    menuLink: row.menu_link,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function usePages() {
  return useQuery({
    queryKey: ['pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapRow);
    },
  });
}

export function usePage(slug: string) {
  return useQuery({
    queryKey: ['pages', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRow(data) : null;
    },
    enabled: !!slug,
  });
}

export function useUpsertPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (page: Partial<Page> & { title: string; slug: string }) => {
      const payload: any = {
        title: page.title,
        slug: page.slug,
        type: page.type || 'custom',
        category_id: page.categoryId || null,
        is_published: page.isPublished ?? false,
        meta_title: page.metaTitle || null,
        meta_description: page.metaDescription || null,
        seo_keywords: page.seoKeywords || null,
        sections: page.sections || [],
        menu_link: page.menuLink || null,
      };
      if (page.id) {
        const { error } = await supabase.from('pages').update(payload).eq('id', page.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pages').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}

export function useBulkDeletePages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('pages').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}
