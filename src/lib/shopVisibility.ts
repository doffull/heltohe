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
