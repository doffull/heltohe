// Catégories "marketplace" : leurs produits ne remontent pas dans la boutique
// générale ni sur la page d'accueil. Ils restent accessibles uniquement via
// leur page de catégorie dédiée (ex: /collab).
export const MARKETPLACE_CATEGORIES = ['Collab'];

const normalize = (v?: string | null) => (v || '').trim().toLowerCase();

export function isMarketplaceCategory(category?: string | null) {
  return MARKETPLACE_CATEGORIES.some(c => normalize(c) === normalize(category));
}

export function excludeMarketplaceProducts<T extends { category?: string | null }>(
  products: T[],
): T[] {
  return products.filter(p => !isMarketplaceCategory(p.category));
}

export function onlyMarketplaceProducts<T extends { category?: string | null }>(
  products: T[],
): T[] {
  return products.filter(p => isMarketplaceCategory(p.category));
}

type CategoryLike = { id: string; title: string; parentId?: string | null };

/**
 * Titres de toutes les catégories marketplace, y compris leurs sous-catégories.
 * Permet d'isoler également les enfants d'une catégorie marketplace (ex: Collab > Sneakers).
 */
export function marketplaceCategoryTitles(categories: CategoryLike[]): string[] {
  const roots = categories.filter(c => isMarketplaceCategory(c.title));
  const rootIds = new Set(roots.map(c => c.id));
  const children = categories.filter(c => c.parentId && rootIds.has(c.parentId));
  return [...roots, ...children].map(c => c.title);
}

export function isInMarketplace(category: string | null | undefined, marketplaceTitles: string[]) {
  return marketplaceTitles.some(t => normalize(t) === normalize(category));
}
