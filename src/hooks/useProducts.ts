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
    templateId: (db.template_id as string) || null,
  };
}

// Transform app product to DB product for insert/update
function appToDbProduct(product: Partial<Product>) {
  return {
    name: product.name,
    subtitle: product.subtitle || null,
    price: product.price,
    sale_price: product.salePrice || null,
    image: sanitizePersistableUrl(product.image) ?? '',
    category: product.category,
    stock: product.stock,
    sku: product.sku,
    description: product.description || null,
    material: product.material || null,
    care_instructions: product.careInstructions || null,
    sizes: product.sizes || [],
    colors: product.colors || [],
    color_options: (product.colorOptions || []) as unknown as Json,
    attributes: (product.attributes || {}) as unknown as Json,
    video_url: sanitizePersistableUrl(product.videoUrl),
    tags: product.tags || [],
    promo_ends_at: product.promoEndsAt || null,
    model_height: product.modelHeight || null,
    model_size_worn: product.modelSizeWorn || null,
    model_name: product.modelName || null,
    gallery_images: sanitizePersistableUrls(product.galleryImages),
    template_id: product.templateId ?? null,
    is_active: true,
  };
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
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
      const dbProduct = appToDbProduct(product);
      const { data, error } = await supabase
        .from('products')
        .insert(dbProduct)
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
        .update(dbProduct)
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
