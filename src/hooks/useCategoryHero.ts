import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TechwearHeroConfig } from '@/types';

export interface CategoryHeroRow {
  id: string;
  category_id: string;
  enabled: boolean;
  config: TechwearHeroConfig;
}

export function useCategoryHero(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['category_hero', categoryId],
    enabled: !!categoryId,
    queryFn: async (): Promise<CategoryHeroRow | null> => {
      const { data, error } = await supabase
        .from('category_hero_settings')
        .select('*')
        .eq('category_id', categoryId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || null;
    },
  });
}

export function useUpsertCategoryHero() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { category_id: string; enabled: boolean; config: TechwearHeroConfig }) => {
      const { error } = await supabase
        .from('category_hero_settings')
        .upsert(payload as any, { onConflict: 'category_id' });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['category_hero', vars.category_id] });
      qc.invalidateQueries({ queryKey: ['category_hero_all'] });
    },
  });
}

export function useAllCategoryHero() {
  return useQuery({
    queryKey: ['category_hero_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_hero_settings')
        .select('*');
      if (error) throw error;
      return (data || []) as any as CategoryHeroRow[];
    },
  });
}
