import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BannerRecord {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  link?: string;
  buttonText?: string;
  type: string;
  isActive: boolean;
  position: number;
  startsAt?: string;
  endsAt?: string;
}

function dbToBanner(db: Record<string, unknown>): BannerRecord {
  return {
    id: db.id as string,
    title: (db.title as string) || '',
    subtitle: (db.subtitle as string) || undefined,
    description: (db.description as string) || undefined,
    image: (db.image as string) || undefined,
    link: (db.link as string) || undefined,
    buttonText: (db.button_text as string) || undefined,
    type: db.type as string,
    isActive: db.is_active as boolean,
    position: (db.position as number) || 0,
    startsAt: (db.starts_at as string) || undefined,
    endsAt: (db.ends_at as string) || undefined,
  };
}

export function useBanners() {
  return useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return (data || []).map((d) => dbToBanner(d as Record<string, unknown>));
    },
  });
}

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (banner: Omit<BannerRecord, 'id'>) => {
      const { error } = await supabase.from('banners').insert({
        title: banner.title,
        subtitle: banner.subtitle || null,
        description: banner.description || null,
        image: banner.image || null,
        link: banner.link || null,
        button_text: banner.buttonText || null,
        type: banner.type as any,
        is_active: banner.isActive,
        position: banner.position,
        starts_at: banner.startsAt || null,
        ends_at: banner.endsAt || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...banner }: BannerRecord) => {
      const { error } = await supabase.from('banners').update({
        title: banner.title,
        subtitle: banner.subtitle || null,
        description: banner.description || null,
        image: banner.image || null,
        link: banner.link || null,
        button_text: banner.buttonText || null,
        type: banner.type as any,
        is_active: banner.isActive,
        position: banner.position,
        starts_at: banner.startsAt || null,
        ends_at: banner.endsAt || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });
}
