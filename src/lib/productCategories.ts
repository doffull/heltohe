// Multi-catégories produit.
// La colonne `category` reste la catégorie PRINCIPALE (fil d'Ariane, SEO,
// template, isolation marketplace). `categories` contient l'ensemble des
// catégories (principale incluse) auxquelles le produit doit apparaître.

export const normCat = (v?: string | null) => (v || '').trim().toLowerCase();

/**
 * Clé de comparaison tolérante : accents, casse, séparateurs et pluriels
 * simples ignorés ("Cagoules" === "cagoule", "Veste & survêt" === "veste-survet").
 */
export function catKey(v?: string | null): string {
  let s = (v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  // Pluriel simple sur le dernier mot
  s = s.replace(/([a-z]{3,})s$/, '$1');
  return s;
}

type ProductLike = { category?: string | null; categories?: string[] | null };

type CategoryLike = { id: string; title: string; parentId?: string | null };

/**
 * Une catégorie + toutes ses sous-catégories (récursif).
 * Permet aux produits rangés dans une sous-catégorie de remonter sur la page parente.
 */
export function categoryWithDescendants(categories: CategoryLike[], title?: string | null): string[] {
  const key = catKey(title);
  if (!key) return [];
  const roots = categories.filter((c) => catKey(c.title) === key);
  if (!roots.length) return [title as string];
  const out = new Set<string>(roots.map((r) => r.title));
  let frontier = roots.map((r) => r.id);
  while (frontier.length) {
    const children = categories.filter((c) => c.parentId && frontier.includes(c.parentId));
    frontier = [];
    children.forEach((c) => {
      if (!out.has(c.title)) {
        out.add(c.title);
        frontier.push(c.id);
      }
    });
  }
  return Array.from(out);
}

/** Le produit appartient-il à l'une de ces catégories ? */
export function productInAnyCategory(p: ProductLike, titles: string[]): boolean {
  if (!titles.length) return false;
  const keys = new Set(titles.map(catKey).filter(Boolean));
  return productCategories(p).some((c) => keys.has(catKey(c)));
}


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

/** Le produit appartient-il à cette catégorie (insensible casse/accents/pluriel) ? */
export function productInCategory(p: ProductLike, category?: string | null): boolean {
  const c = catKey(category);
  if (!c) return false;
  return productCategories(p).some((x) => catKey(x) === c);
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
