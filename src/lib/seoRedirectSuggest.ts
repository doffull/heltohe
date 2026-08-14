import { catKey } from '@/lib/productCategories';

export interface RedirectTarget {
  path: string;
  label: string;
  group: 'Catégories' | 'Produits' | 'Boutiques & stands' | 'Pages';
  /** Mots-clés servant au rapprochement automatique. */
  keywords: string[];
}

export const STATIC_TARGETS: RedirectTarget[] = [
  { path: '/', label: 'Accueil', group: 'Pages', keywords: ['accueil', 'home', 'index'] },
  { path: '/boutique', label: 'Boutique (tous les produits)', group: 'Pages', keywords: ['boutique', 'shop', 'catalogue', 'produits', 'collections'] },
  { path: '/trouver-une-boutique', label: 'Trouver une boutique / stand', group: 'Boutiques & stands', keywords: ['boutiques', 'stands', 'magasins', 'points-de-vente', 'stores', 'revendeurs'] },
  { path: '/boutiques', label: 'Nos boutiques', group: 'Boutiques & stands', keywords: ['boutiques', 'stands', 'magasin', 'store-locator'] },
  { path: '/contact', label: 'Contact', group: 'Pages', keywords: ['contact', 'nous-contacter'] },
  { path: '/a-propos', label: 'À propos', group: 'Pages', keywords: ['a-propos', 'about', 'histoire', 'marque'] },
  { path: '/cgv', label: 'CGV', group: 'Pages', keywords: ['cgv', 'conditions', 'terms'] },
  { path: '/mentions-legales', label: 'Mentions légales', group: 'Pages', keywords: ['mentions-legales', 'legal'] },
  { path: '/confidentialite', label: 'Confidentialité', group: 'Pages', keywords: ['confidentialite', 'privacy', 'donnees'] },
  { path: '/retours', label: 'Retours', group: 'Pages', keywords: ['retours', 'returns', 'echange', 'livraison'] },
  { path: '/guide-des-tailles', label: 'Guide des tailles', group: 'Pages', keywords: ['guide-des-tailles', 'size-guide', 'tailles'] },
  { path: '/fidelite', label: 'Fidélité', group: 'Pages', keywords: ['fidelite', 'loyalty', 'points'] },
  { path: '/panier', label: 'Panier', group: 'Pages', keywords: ['panier', 'cart'] },
];

const STOP = new Set(['fr', 'en', 'www', 'html', 'php', 'index', 'produit', 'product', 'category', 'categorie', 'collection', 'collections', 'shop', 'p', 'c']);

/** Découpe un chemin en jetons comparables. */
export function pathTokens(path: string): string[] {
  return catKey(path.replace(/\.(html?|php|aspx?)$/i, ''))
    .split('-')
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function score(tokens: string[], target: RedirectTarget): number {
  if (!tokens.length) return 0;
  const kw = target.keywords.flatMap((k) => catKey(k).split('-')).filter(Boolean);
  if (!kw.length) return 0;
  let hits = 0;
  for (const t of tokens) {
    if (kw.some((k) => k === t || (k.length > 3 && t.length > 3 && (k.includes(t) || t.includes(k))))) hits += 1;
  }
  return hits / Math.max(tokens.length, 1) + hits * 0.1;
}

/** Meilleure cible pour une ancienne URL, ou null si rien de fiable. */
export function suggestTarget(oldPath: string, targets: RedirectTarget[]): { target: RedirectTarget; confidence: number } | null {
  const tokens = pathTokens(oldPath);
  let best: { target: RedirectTarget; confidence: number } | null = null;
  for (const t of targets) {
    const s = score(tokens, t);
    if (s > 0 && (!best || s > best.confidence)) best = { target: t, confidence: s };
  }
  if (!best || best.confidence < 0.34) return null;
  return best;
}
