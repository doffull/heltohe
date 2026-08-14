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

/** Règles par catégorie : familles détectées dans l'ancienne URL. */
export interface CategoryRule {
  /** Nom lisible de la famille (affiché comme raison). */
  family: string;
  /** Jetons déclencheurs dans l'ancienne URL. */
  match: string[];
  /** Jetons attendus dans la cible (catégorie du nouveau site). */
  targetKeywords: string[];
}

export const CATEGORY_RULES: CategoryRule[] = [
  { family: 'Homme', match: ['homme', 'hommes', 'men', 'mens', 'man', 'male', 'him'], targetKeywords: ['homme', 'men'] },
  { family: 'Femme', match: ['femme', 'femmes', 'women', 'womens', 'woman', 'female', 'her'], targetKeywords: ['femme', 'women'] },
  { family: 'Enfant', match: ['enfant', 'enfants', 'kid', 'kids', 'junior', 'juniors', 'fille', 'garcon', 'bebe', 'baby', 'youth'], targetKeywords: ['enfant', 'kids', 'junior'] },
  { family: 'Sportwear', match: ['sport', 'sportwear', 'sportswear', 'training', 'gym', 'fitness', 'running', 'jogging', 'athletic'], targetKeywords: ['sport', 'sportwear', 'sportswear'] },
  { family: 'Collab', match: ['collab', 'collabs', 'collaboration', 'capsule', 'limited', 'edition', 'pegashoes'], targetKeywords: ['collab', 'capsule'] },
  { family: 'Boutiques & stands', match: ['boutique', 'boutiques', 'stand', 'stands', 'magasin', 'magasins', 'store', 'stores', 'revendeur', 'revendeurs', 'points', 'vente'], targetKeywords: ['boutique', 'stand', 'magasin', 'store'] },
  { family: 'Accessoires', match: ['accessoire', 'accessoires', 'accessory', 'accessories', 'casquette', 'bonnet', 'sac'], targetKeywords: ['accessoire', 'accessories'] },
  { family: 'Chaussures', match: ['chaussure', 'chaussures', 'shoes', 'sneakers', 'basket', 'baskets'], targetKeywords: ['chaussure', 'shoes', 'sneakers'] },
];

/** Familles détectées dans une ancienne URL (règles par catégorie). */
export function detectFamilies(oldPath: string): CategoryRule[] {
  const tokens = new Set(pathTokens(oldPath));
  return CATEGORY_RULES.filter((rule) => rule.match.some((m) => tokens.has(catKey(m))));
}

function bigrams(value: string): Set<string> {
  const s = value.replace(/-/g, '');
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2));
  return out;
}

/** Similarité de slug (coefficient de Dice sur bigrammes), entre 0 et 1. */
export function slugSimilarity(a: string, b: string): number {
  const ka = catKey(a);
  const kb = catKey(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 1;
  const A = bigrams(ka);
  const B = bigrams(kb);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((g) => { if (B.has(g)) inter += 1; });
  return (2 * inter) / (A.size + B.size);
}

/** Dernier segment significatif d'un chemin (le « slug »). */
export function lastSegment(path: string): string {
  const parts = path.replace(/\.(html?|php|aspx?)$/i, '').split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function keywordScore(tokens: string[], target: RedirectTarget): number {
  if (!tokens.length) return 0;
  const kw = target.keywords.flatMap((k) => catKey(k).split('-')).filter(Boolean);
  if (!kw.length) return 0;
  let hits = 0;
  for (const t of tokens) {
    if (kw.some((k) => k === t || (k.length > 3 && t.length > 3 && (k.includes(t) || t.includes(k))))) hits += 1;
  }
  return Math.min(1, hits / Math.max(tokens.length, 1) + hits * 0.1);
}

function ruleScore(families: CategoryRule[], target: RedirectTarget): { score: number; family?: string } {
  if (!families.length) return { score: 0 };
  const hay = catKey([target.path, target.label, ...target.keywords].join(' '));
  for (const f of families) {
    if (f.targetKeywords.some((k) => hay.includes(catKey(k)))) return { score: 1, family: f.family };
  }
  return { score: 0, family: families[0].family };
}

export interface RedirectSuggestion {
  target: RedirectTarget;
  /** Score de confiance normalisé entre 0 et 1. */
  confidence: number;
  /** Explication lisible du rapprochement. */
  reason: string;
}

/**
 * Suggestions classées pour une ancienne URL.
 * Combine règles par catégorie (40 %), similarité de slug (40 %) et mots-clés (20 %).
 */
export function suggestTargets(
  oldPath: string,
  targets: RedirectTarget[],
  limit = 3,
): RedirectSuggestion[] {
  const tokens = pathTokens(oldPath);
  if (!tokens.length) return [];
  const families = detectFamilies(oldPath);
  const slug = lastSegment(oldPath);

  const scored: RedirectSuggestion[] = [];
  for (const target of targets) {
    const rule = ruleScore(families, target);
    const sim = Math.max(
      slugSimilarity(slug, lastSegment(target.path)),
      ...target.keywords.map((k) => slugSimilarity(slug, k)),
    );
    const kw = keywordScore(tokens, target);
    const confidence = Math.min(1, rule.score * 0.4 + sim * 0.4 + kw * 0.2);
    if (confidence < 0.3) continue;

    const bits: string[] = [];
    if (rule.score > 0 && rule.family) bits.push(`règle « ${rule.family} »`);
    if (sim >= 0.4) bits.push(`slug proche (${Math.round(sim * 100)} %)`);
    if (kw >= 0.4) bits.push('mots-clés communs');
    scored.push({
      target,
      confidence,
      reason: bits.length ? bits.join(' + ') : 'rapprochement faible',
    });
  }

  return scored
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

/** Seuil au-delà duquel une suggestion peut être validée automatiquement. */
export const HIGH_CONFIDENCE = 0.75;

/** Meilleure cible pour une ancienne URL, ou null si rien de fiable. */
export function suggestTarget(oldPath: string, targets: RedirectTarget[]): RedirectSuggestion | null {
  return suggestTargets(oldPath, targets, 1)[0] ?? null;
}
