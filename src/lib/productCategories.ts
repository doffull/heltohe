// Multi-catégories produit.
// La colonne `category` reste la catégorie PRINCIPALE (fil d'Ariane, SEO,
// template, isolation marketplace). `categories` contient l'ensemble des
// catégories (principale incluse) auxquelles le produit doit apparaître.

export const normCat = (v?: string | null) => (v || '').trim().toLowerCase();

type ProductLike = { category?: string | null; categories?: string[] | null };

/** Union dédupliquée : catégorie principale + catégories additionnelles. */
export function productCategories(p: ProductLike): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (c?: string | null) => {
    const v = (c || '').trim();
    if (!v) return;
    const k = normCat(v);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(v);
  };
  push(p.category);
  (p.categories || []).forEach(push);
  return out;
}

/** Le produit appartient-il à cette catégorie (exacte, insensible à la casse) ? */
export function productInCategory(p: ProductLike, category?: string | null): boolean {
  const c = normCat(category);
  if (!c) return false;
  return productCategories(p).some((x) => normCat(x) === c);
}

/** Correspondance souple (contient) — utilisée par le méga menu et les sections auto. */
export function productMatchesCategoryLoose(p: ProductLike, keyword?: string | null): boolean {
  const k = normCat(keyword);
  if (!k) return false;
  return productCategories(p).some((x) => {
    const n = normCat(x);
    return n === k || n.includes(k) || k.includes(n);
  });
}

/** Texte recherchable (toutes les catégories concaténées). */
export function productCategoriesText(p: ProductLike): string {
  return productCategories(p).join(' ').toLowerCase();
}
