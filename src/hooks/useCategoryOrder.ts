import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface CategoryOrderRow {
  category_slug: string;
  product_id: string;
  position: number;
}

/** Fetches all manual orderings; consumers filter by category. */
export function useCategoryOrders() {
  return useQuery({
    queryKey: ['product-category-order'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_category_order' as any)
        .select('category_slug, product_id, position')
        .order('position', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CategoryOrderRow[];
    },
    staleTime: 60_000,
  });
}

/** Deterministic seeded shuffle so a category's order is stable within a session but varies across visits. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getSessionSeed(): number {
  if (typeof sessionStorage === 'undefined') return Math.floor(Math.random() * 1e9);
  const key = 'lvtk_shuffle_seed';
  let v = sessionStorage.getItem(key);
  if (!v) {
    v = String(Math.floor(Math.random() * 1e9) + 1);
    sessionStorage.setItem(key, v);
  }
  return Number(v);
}

/**
 * Applies manual ordering (if any rows exist for the given slug) then shuffles the rest.
 * When no manual rows exist, the whole list is shuffled deterministically per session.
 */
export function useOrderedProducts<T extends { id: string }>(
  products: T[],
  categorySlug: string | null | undefined,
): T[] {
  const { data: orders = [] } = useCategoryOrders();
  return useMemo(() => {
    if (!products || products.length === 0) return products;
    const seed = getSessionSeed();
    if (!categorySlug || categorySlug === 'Tout') {
      return seededShuffle(products, seed);
    }
    const rows = orders.filter((o) => o.category_slug === categorySlug);
    if (rows.length === 0) {
      return seededShuffle(products, seed + categorySlug.length);
    }
    const posById = new Map(rows.map((r) => [r.product_id, r.position]));
    const pinned = products.filter((p) => posById.has(p.id))
      .sort((a, b) => (posById.get(a.id)! - posById.get(b.id)!));
    const rest = seededShuffle(
      products.filter((p) => !posById.has(p.id)),
      seed + categorySlug.length,
    );
    return [...pinned, ...rest];
  }, [products, orders, categorySlug]);
}

export function useSaveCategoryOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ categorySlug, productIds }: { categorySlug: string; productIds: string[] }) => {
      // Wipe existing rows for that slug then insert the new order
      const { error: delErr } = await supabase
        .from('product_category_order' as any)
        .delete()
        .eq('category_slug', categorySlug);
      if (delErr) throw delErr;
      if (productIds.length === 0) return;
      const rows = productIds.map((pid, i) => ({
        category_slug: categorySlug,
        product_id: pid,
        position: i,
      }));
      const { error: insErr } = await supabase.from('product_category_order' as any).insert(rows);
      if (insErr) throw insErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-category-order'] }),
  });
}

export function useResetCategoryOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (categorySlug: string) => {
      const { error } = await supabase
        .from('product_category_order' as any)
        .delete()
        .eq('category_slug', categorySlug);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-category-order'] }),
  });
}
