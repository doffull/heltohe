import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, ColorOption } from '@/types';
import { Json } from '@/integrations/supabase/types';
import { sanitizePersistableUrl, sanitizePersistableUrls } from '@/lib/mediaUrl';

// Transform DB product to app product
function dbToAppProduct(db: Record<string, unknown>): Product {
  return {
    id: db.id as string,
    name: db.name as string,
    subtitle: (db.subtitle as string) || undefined,
    price: Number(db.price),
    salePrice: db.sale_price ? Number(db.sale_price) : undefined,
    image: db.image as string,
    category: db.category as string,
    categories: (db.categories as string[]) || (db.category ? [db.category as string] : []),
    stock: db.stock as number,
    sku: db.sku as string,
    description: (db.description as string) || undefined,
    material: (db.material as string) || undefined,
    careInstructions: (db.care_instructions as string) || undefined,
    sizes: (db.sizes as string[]) || [],
    colors: (db.colors as string[]) || [],
    colorOptions: (db.color_options as ColorOption[]) || [],
    attributes: (db.attributes as Record<string, string>) || {},
    videoUrl: (db.video_url as string) || undefined,
    tags: (db.tags as string[]) || [],
    promoEndsAt: (db.promo_ends_at as string) || undefined,
    modelHeight: (db.model_height as string) || undefined,
    modelSizeWorn: (db.model_size_worn as string) || undefined,
    modelName: (db.model_name as string) || undefined,
    galleryImages: (db.gallery_images as string[]) || [],
    hoverImage: (db.hover_image as string) || undefined,
    titleLogo: (db.title_logo as string) || undefined,
    tryonMode: ((db.tryon_mode as string) || 'both') as Product['tryonMode'],

    templateId: (db.template_id as string) || null,
    isActive: db.is_active === undefined || db.is_active === null ? true : Boolean(db.is_active),
    limitedEdition: Boolean(db.limited_edition),
    limitedEditionLabel: (db.limited_edition_label as string) || undefined,
    limitedEditionColor: (db.limited_edition_color as string) || undefined,
    limitedEditionTextColor: (db.limited_edition_text_color as string) || undefined,
    limitedEditionPosition: ((db.limited_edition_position as string) || undefined) as Product['limitedEditionPosition'],
    status: ((db.status as string) === 'draft' ? 'draft' : 'published') as Product['status'],
    deletedAt: (db.deleted_at as string) || null,
  };
}

// Field-by-field mapping App → DB. Each entry is only included in the payload
// if the key is actually present in the input, so partial updates never wipe
// unrelated columns (e.g. editing price inline must not clear gallery_images).
const FIELD_MAP: Record<string, { col: string; transform: (v: any) => any }> = {
  name: { col: 'name', transform: (v) => v },
  subtitle: { col: 'subtitle', transform: (v) => (v ? String(v).trim().toUpperCase() : null) },
  price: { col: 'price', transform: (v) => v },
  salePrice: { col: 'sale_price', transform: (v) => v || null },
  image: { col: 'image', transform: (v) => sanitizePersistableUrl(v) ?? '' },
  category: { col: 'category', transform: (v) => v },
  categories: { col: 'categories', transform: (v) => Array.from(new Set(((v || []) as string[]).map((x) => String(x).trim()).filter(Boolean))) },
  stock: { col: 'stock', transform: (v) => v },
  sku: { col: 'sku', transform: (v) => v },
  description: { col: 'description', transform: (v) => v || null },
  material: { col: 'material', transform: (v) => v || null },
  careInstructions: { col: 'care_instructions', transform: (v) => v || null },
  sizes: { col: 'sizes', transform: (v) => v || [] },
  colors: { col: 'colors', transform: (v) => v || [] },
  colorOptions: { col: 'color_options', transform: (v) => (v || []) as unknown as Json },
  attributes: { col: 'attributes', transform: (v) => (v || {}) as unknown as Json },
  videoUrl: { col: 'video_url', transform: (v) => sanitizePersistableUrl(v) },
  tags: { col: 'tags', transform: (v) => v || [] },
  promoEndsAt: { col: 'promo_ends_at', transform: (v) => v || null },
  modelHeight: { col: 'model_height', transform: (v) => v || null },
  modelSizeWorn: { col: 'model_size_worn', transform: (v) => v || null },
  modelName: { col: 'model_name', transform: (v) => v || null },
  galleryImages: { col: 'gallery_images', transform: (v) => sanitizePersistableUrls(v) },
  hoverImage: { col: 'hover_image', transform: (v) => sanitizePersistableUrl(v) },
  titleLogo: { col: 'title_logo', transform: (v) => sanitizePersistableUrl(v) },
  tryonMode: { col: 'tryon_mode', transform: (v) => v || 'both' },

  templateId: { col: 'template_id', transform: (v) => v ?? null },
  isActive: { col: 'is_active', transform: (v) => v },
  limitedEdition: { col: 'limited_edition', transform: (v) => Boolean(v) },
  limitedEditionLabel: { col: 'limited_edition_label', transform: (v) => (v ? String(v) : null) },
  limitedEditionColor: { col: 'limited_edition_color', transform: (v) => v || null },
  limitedEditionTextColor: { col: 'limited_edition_text_color', transform: (v) => v || null },
  limitedEditionPosition: { col: 'limited_edition_position', transform: (v) => v || null },
  status: { col: 'status', transform: (v) => (v === 'draft' ? 'draft' : 'published') },
};

function appToDbProduct(product: Partial<Product> & { isActive?: boolean }): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(product)) {
    const map = FIELD_MAP[key];
    if (!map) continue;
    out[map.col] = map.transform((product as any)[key]);
  }
  return out;
}

function appToDbProductFull(product: Omit<Product, 'id'>): Record<string, unknown> {
  return {
    ...appToDbProduct(product),
    image: sanitizePersistableUrl(product.image) ?? '',
    sizes: product.sizes || [],
    colors: product.colors || [],
    color_options: (product.colorOptions || []) as unknown as Json,
    attributes: (product.attributes || {}) as unknown as Json,
    tags: product.tags || [],
    gallery_images: sanitizePersistableUrls(product.galleryImages),
    is_active: (product as { isActive?: boolean }).isActive ?? true,
  };
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(dbToAppProduct);
    },
    staleTime: 0,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return dbToAppProduct(data as Record<string, unknown>);
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id'>) => {
      const dbProduct = appToDbProductFull(product);
      const { data, error } = await supabase
        .from('products')
        .insert(dbProduct as any)
        .select()
        .single();
      
      if (error) throw error;
      return dbToAppProduct(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...product }: Partial<Product> & { id: string }) => {
      const dbProduct = appToDbProduct(product);
      const { data, error } = await supabase
        .from('products')
        .update(dbProduct as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return dbToAppProduct(data as Record<string, unknown>);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useBulkDeleteProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useBulkUpdateProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: { category?: string; price?: number; sale_price?: number | null; stock?: number; is_active?: boolean } }) => {
      const { error } = await supabase.from('products').update(updates).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

// Apply row-specific updates (each row gets its own patch — needed for
// percentage/relative adjustments where the resulting value depends on the
// current row). Runs sequentially to keep RLS + audit predictable.
export function useBulkUpdatePerRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { id: string; updates: Partial<Product> & { isActive?: boolean } }[]) => {
      let success = 0;
      const errors: string[] = [];
      for (const r of rows) {
        const payload = appToDbProduct(r.updates);
        if (Object.keys(payload).length === 0) continue;
        const { error } = await supabase.from('products').update(payload as any).eq('id', r.id);
        if (error) errors.push(`${r.id}: ${error.message}`);
        else success++;
      }
      return { success, errors };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}
