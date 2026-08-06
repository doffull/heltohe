import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CollabColor = { label: string; color: string; color2?: string; image?: string };

export type HoverEffect = 'fade' | 'zoom' | 'slide';

export interface CollabSettings {
  sizes: string[];
  colors: CollabColor[];
  page: {
    title: string;
    subtitle: string;
    intro: string;
    heroImage: string;
    ctaLabel: string;
    ctaHref: string;
    metaTitle: string;
    metaDescription: string;
  };
  animation: {
    hoverEnabled: boolean;
    hoverEffect: HoverEffect;
    hoverDuration: number;
  };
  layout: {
    columnsMobile: number;
    columnsTablet: number;
    columnsDesktop: number;
    swatchStyle: 'round' | 'square' | 'separated' | 'geometric';
    showSizes: boolean;
    badgePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
}

export interface ShopHoverSettings {
  enabled: boolean;
  effect: HoverEffect;
  duration: number;
}

export const DEFAULT_COLLAB_SETTINGS: CollabSettings = {
  sizes: [],
  colors: [],
  page: {
    title: 'COLLAB',
    subtitle: 'HELVETICA MOUNTAIN PIONEERS X PEGASHOES',
    intro: '',
    heroImage: '',
    ctaLabel: '',
    ctaHref: '',
    metaTitle: '',
    metaDescription: '',
  },
  animation: { hoverEnabled: true, hoverEffect: 'fade', hoverDuration: 500 },
  layout: {
    columnsMobile: 2,
    columnsTablet: 2,
    columnsDesktop: 3,
    swatchStyle: 'round',
    showSizes: true,
    badgePosition: 'bottom-right',
  },
};

export const DEFAULT_SHOP_HOVER: ShopHoverSettings = { enabled: true, effect: 'fade', duration: 500 };

function merge(raw: any): CollabSettings {
  const d = DEFAULT_COLLAB_SETTINGS;
  return {
    sizes: Array.isArray(raw?.sizes) ? raw.sizes : d.sizes,
    colors: Array.isArray(raw?.colors) ? raw.colors : d.colors,
    page: { ...d.page, ...(raw?.page || {}) },
    animation: { ...d.animation, ...(raw?.animation || {}) },
    layout: { ...d.layout, ...(raw?.layout || {}) },
  };
}

const QK = ['collab-settings'];

export function useCollabSettings() {
  return useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('design_settings_public')
        .select('collab_settings, shop_hover_effect')
        .eq('settings_key', 'main')
        .maybeSingle();
      if (error) throw error;
      return {
        collab: merge((data as any)?.collab_settings),
        shopHover: { ...DEFAULT_SHOP_HOVER, ...(((data as any)?.shop_hover_effect) || {}) } as ShopHoverSettings,
      };
    },
    staleTime: 30_000,
  });
}

export function useUpdateCollabSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { collab?: CollabSettings; shopHover?: ShopHoverSettings }) => {
      const update: Record<string, unknown> = {};
      if (payload.collab) update.collab_settings = payload.collab as any;
      if (payload.shopHover) update.shop_hover_effect = payload.shopHover as any;
      const { error } = await supabase
        .from('design_settings')
        .update(update as any)
        .eq('settings_key', 'main');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
