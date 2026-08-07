import { useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { isMarketplaceProduct, marketplaceCategoryTitles } from '@/lib/shopVisibility';

/**
 * Source de vérité unique pour la vitrine : le catalogue "normal" (Homme, Femme,
 * Enfant, ...) n'inclut JAMAIS les produits marketplace (Collab), y compris ceux
 * rangés dans une sous-catégorie de Collab.
 */
export function useShopProducts() {
  const query = useProducts();
  const { data: categories = [] } = useCategories();

  const titles = useMemo(() => marketplaceCategoryTitles(categories as any), [categories]);

  const data = useMemo(
    () => (query.data || []).filter(p => !isMarketplaceProduct(p, titles)),
    [query.data, titles],
  );

  return { ...query, data } as typeof query;
}

/** Produits marketplace (Collab) uniquement — utilisé par l'espace /collab. */
export function useCollabProducts() {
  const query = useProducts();
  const { data: categories = [] } = useCategories();

  const titles = useMemo(() => marketplaceCategoryTitles(categories as any), [categories]);

  const data = useMemo(
    () => (query.data || []).filter(p => isMarketplaceProduct(p, titles)),
    [query.data, titles],
  );

  return { ...query, data } as typeof query;
}
