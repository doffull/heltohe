import type { Product } from '@/types';

/** Mots de couleur / finition à retirer pour retrouver le nom "famille" d'un produit. */
const COLOR_WORDS = [
  'noir', 'noire', 'black', 'blanc', 'blanche', 'white', 'gris', 'grise', 'grey', 'gray',
  'kaki', 'khaki', 'vert', 'verte', 'green', 'bleu', 'bleue', 'blue', 'marine', 'navy',
  'rouge', 'red', 'bordeaux', 'beige', 'sable', 'sand', 'camel', 'taupe', 'creme', 'cream',
  'ecru', 'jaune', 'yellow', 'orange', 'rose', 'pink', 'violet', 'purple', 'marron', 'brown',
  'argent', 'silver', 'or', 'gold', 'camo', 'camouflage', 'bicolore', 'multicolore',
];

const strip = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Clé de regroupement : nom du produit débarrassé de sa mention de couleur.
 * "PEGA ONE Noir" et "PEGA ONE Kaki" partagent la même clé.
 */
export function productFamilyKey(product: Pick<Product, 'name' | 'category'>): string {
  const tokens = strip(product.name)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .filter((t) => !COLOR_WORDS.includes(t));
  const base = tokens.join(' ').trim();
  return base || strip(product.name).trim();
}

/** Produits de la même famille (variations de couleur), hors produit courant. */
export function getFamilyVariants(products: Product[], current: Product): Product[] {
  const key = productFamilyKey(current);
  if (!key) return [];
  return products.filter(
    (p) => p.id !== current.id && p.isActive !== false && productFamilyKey(p) === key
  );
}

/**
 * Réordonne une liste pour que les produits d'une même famille soient côte à côte,
 * en conservant l'ordre d'apparition de la première occurrence de chaque famille.
 */
export function groupFamiliesAdjacent<T extends Pick<Product, 'name' | 'category'>>(list: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const item of list) {
    const key = productFamilyKey(item);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return Array.from(groups.values()).flat();
}

/** Détecte un article enfant (catégorie ou tags). */
export function isKidsProduct(product?: Partial<Product> | null): boolean {
  if (!product) return false;
  const hay = strip([product.category, ...(product.tags || [])].filter(Boolean).join(' '));
  return /enfant|kids|kid|junior|bebe|baby/.test(hay);
}
