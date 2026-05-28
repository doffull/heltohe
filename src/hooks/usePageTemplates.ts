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

// Strip undefineds — JSONB columns reject them and they break upsert payloads.
function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v ?? null));
}

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `tpl-${Date.now().toString(36)}`;
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
      const slug = slugify(t.slug || t.name);
      const payload: any = clean({
        name: t.name?.trim() || 'Template sans nom',
        slug,
        type: t.type,
        is_default: !!t.isDefault,
        theme: t.theme || {},
        layout: t.layout || { grid: { cols: 12, gap: 16 }, blocks: [] },
        preview_image: t.previewImage || null,
      });

      // If marking as default, clear other defaults of same type to avoid unique conflict.
      if (payload.is_default) {
        const { error: e0 } = await supabase
          .from('page_templates' as any)
          .update({ is_default: false })
          .eq('type', payload.type)
          .neq('id', t.id || '00000000-0000-0000-0000-000000000000');
        if (e0) throw new Error(`Default cleanup: ${e0.message}`);
      }

      if (t.id) {
        const { error } = await supabase.from('page_templates' as any).update(payload).eq('id', t.id);
        if (error) throw new Error(error.message + (error.details ? ` (${error.details})` : ''));
        return t.id;
      } else {
        // Ensure slug is unique on insert by suffixing if needed.
        let finalSlug = slug;
        for (let i = 0; i < 5; i++) {
          const { data: exist } = await supabase.from('page_templates' as any).select('id').eq('slug', finalSlug).maybeSingle();
          if (!exist) break;
          finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        }
        payload.slug = finalSlug;
        const { data, error } = await supabase.from('page_templates' as any).insert(payload).select('id').single();
        if (error) throw new Error(error.message + (error.details ? ` (${error.details})` : ''));
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
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['page_templates'] }),
  });
}
