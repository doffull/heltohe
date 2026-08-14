import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RedirectStatus = 'valid' | 'review';

export interface SeoRedirect {
  id: string;
  oldUrl: string;
  oldPath: string;
  newPath: string;
  status: RedirectStatus;
  source: string;
  notes?: string | null;
}

const TABLE = 'seo_redirects' as any;

function fromDb(d: any): SeoRedirect {
  return {
    id: d.id,
    oldUrl: d.old_url,
    oldPath: d.old_path,
    newPath: d.new_path || '',
    status: (d.status as RedirectStatus) || 'review',
    source: d.source || 'manual',
    notes: d.notes,
  };
}

/** Normalise une URL vers un chemin comparable ("/homme/veste"). */
export function toPath(input: string): string {
  let s = (input || '').trim();
  if (!s) return '';
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname + new URL(s).search;
  } catch { /* garde la chaîne brute */ }
  s = s.split('#')[0];
  if (!s.startsWith('/')) s = `/${s}`;
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s.toLowerCase();
}

export function useSeoRedirects() {
  return useQuery({
    queryKey: ['seo-redirects'],
    queryFn: async (): Promise<SeoRedirect[]> => {
      const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(fromDb);
    },
  });
}

export function useSeoRedirectMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['seo-redirects'] });

  const upsertMany = useMutation({
    mutationFn: async (rows: Array<{ oldUrl: string; newPath?: string; status?: RedirectStatus; source?: string }>) => {
      const payload = rows
        .map((r) => ({
          old_url: r.oldUrl,
          old_path: toPath(r.oldUrl),
          new_path: r.newPath || '',
          status: r.status || 'review',
          source: r.source || 'manual',
        }))
        .filter((r) => r.old_path && r.old_path !== '/');
      if (!payload.length) return 0;
      const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'old_path' });
      if (error) throw error;
      return payload.length;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; newPath?: string; status?: RedirectStatus; notes?: string }) => {
      const db: Record<string, unknown> = {};
      if (patch.newPath !== undefined) db.new_path = patch.newPath;
      if (patch.status !== undefined) db.status = patch.status;
      if (patch.notes !== undefined) db.notes = patch.notes;
      const { error } = await supabase.from(TABLE).update(db).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from(TABLE).delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { upsertMany, update, remove };
}
