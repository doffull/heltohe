import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductStockData {
  bySize: Record<string, number>;
  total: number;
}

/**
 * Returns available stock per size for a given product.
 * Available = quantity - reserved, summed across all locations.
 */
export function useProductStock(productId?: string | null) {
  return useQuery<ProductStockData>({
    queryKey: ['product-stock', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data: inv } = await supabase
        .from('inventory')
        .select('id')
        .eq('product_id', productId!)
        .maybeSingle();

      if (!inv) return { bySize: {}, total: 0 };

      const { data: levels } = await supabase
        .from('stock_levels')
        .select('size, quantity, reserved')
        .eq('inventory_id', inv.id);

      const bySize: Record<string, number> = {};
      let total = 0;
      (levels || []).forEach((l: any) => {
        const avail = Math.max(0, (l.quantity || 0) - (l.reserved || 0));
        const key = l.size || '_';
        bySize[key] = (bySize[key] || 0) + avail;
        total += avail;
      });
      return { bySize, total };
    },
    staleTime: 30_000,
  });
}

export function stockBadgeColor(qty: number): string {
  if (qty <= 0) return '#dc2626'; // red
  if (qty < 10) return '#f59e0b'; // orange
  return '#16a34a'; // green
}
