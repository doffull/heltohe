import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { HomeFabButton } from '@/types';

const KEY = ['home_fab_buttons'];

export function useHomeFabButtons(opts: { adminAll?: boolean } = {}) {
  return useQuery({
    queryKey: [...KEY, opts.adminAll ? 'all' : 'public'],
    queryFn: async () => {
      let q = supabase.from('home_fab_buttons').select('*').order('sort_order');
      if (!opts.adminAll) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as HomeFabButton[];
    },
  });
}

export function useHomeFabMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const upsert = useMutation({
    mutationFn: async (b: Partial<HomeFabButton> & { id?: string }) => {
      const payload = { ...b } as any;
      delete payload.created_at;
      delete payload.updated_at;
      const { data, error } = await supabase.from('home_fab_buttons').upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('home_fab_buttons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { upsert, remove };
}
