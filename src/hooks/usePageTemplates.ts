import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PageTemplate } from '@/config/templatePresets';

function mapRow(row: any): PageTemplate & { id: string } {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    isDefault: row.is_default,
    theme: row.theme,
    layout: row.layout,
    previewImage: row.preview_image || undefined,
  };
}

export function usePageTemplates(type?: 'product' | 'category') {
  return useQuery({
    queryKey: ['page_templates', type || 'all'],
    queryFn: async () => {
      let q = supabase.from('page_templates' as any).select('*').order('created_at', { ascending: false });
      if (type) q = q.eq('type', type);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(mapRow);
    },
  });
}

export function usePageTemplate(id?: string) {
  return useQuery({
    queryKey: ['page_templates', 'one', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('page_templates' as any).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? mapRow(data) : null;
    },
    enabled: !!id,
  });
}

export function useDefaultTemplate(type: 'product' | 'category') {
  return useQuery({
    queryKey: ['page_templates', 'default', type],
    queryFn: async () => {
      const { data, error } = await supabase.from('page_templates' as any)
        .select('*').eq('type', type).eq('is_default', true).maybeSingle();
      if (error) throw error;
      return data ? mapRow(data) : null;
    },
  });
}

export function useUpsertTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: PageTemplate & { id?: string }) => {
      const payload: any = {
        name: t.name,
        slug: t.slug,
        type: t.type,
        is_default: t.isDefault ?? false,
        theme: t.theme,
        layout: t.layout,
        preview_image: t.previewImage || null,
      };
      if (t.id) {
        const { error } = await supabase.from('page_templates' as any).update(payload).eq('id', t.id);
        if (error) throw error;
        return t.id;
      } else {
        const { data, error } = await supabase.from('page_templates' as any).insert(payload).select('id').single();
        if (error) throw error;
        return (data as any).id as string;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['page_templates'] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('page_templates' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['page_templates'] }),
  });
}
