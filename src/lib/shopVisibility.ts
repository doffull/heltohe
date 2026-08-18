// Catégories "marketplace" : leurs produits ne remontent pas dans la boutique
// générale ni sur la page d'accueil. Ils restent accessibles uniquement via
// leur page de catégorie dédiée (ex: /collab).
export const MARKETPLACE_CATEGORIES = ['Collab'];

import { productCategories } from './productCategories';

const normalize = (v?: string | null) => (v || '').trim().toLowerCase();

type ProductLike = { category?: string | null; categories?: string[] | null };

/** Un produit est marketplace si N'IMPORTE laquelle de ses catégories l'est. */
export function isMarketplaceProduct(p: ProductLike, marketplaceTitles?: string[]) {
  const cats = productCategories(p);
  if (marketplaceTitles && marketplaceTitles.length > 0) {
    return cats.some((c) => marketplaceTitles.some((t) => normalize(t) === normalize(c)));
  }
  return cats.some((c) => isMarketplaceCategory(c));
}

export function isMarketplaceCategory(category?: string | null) {
  return MARKETPLACE_CATEGORIES.some(c => normalize(c) === normalize(category));
}

type PublishableLike = { status?: string | null; deletedAt?: string | null };

/** Un produit brouillon ou en corbeille n'est jamais visible côté client. */
export function isPubliclyVisibleProduct(p: PublishableLike) {
  return !p.deletedAt && (p.status ?? 'published') !== 'draft';
}

export function excludeUnpublishedProducts<T extends PublishableLike>(products: T[]): T[] {
  return products.filter(isPubliclyVisibleProduct);
}

export function excludeMarketplaceProducts<T extends ProductLike & PublishableLike>(products: T[]): T[] {
  return products.filter(p => isPubliclyVisibleProduct(p) && !isMarketplaceProduct(p));
}

export function onlyMarketplaceProducts<T extends ProductLike & PublishableLike>(products: T[]): T[] {
  return products.filter(p => isPubliclyVisibleProduct(p) && isMarketplaceProduct(p));
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
