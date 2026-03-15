
## Audit complet — Résultats

### Problème 1 (Données) : La page "Femme" a un `category_id = NULL`
La page `/femme` dans la table `pages` n'est pas rattachée à la catégorie Femme. Les 3 autres (Homme, Enfant, Accessoire) sont correctement liées. C'est une donnée corrompue à corriger par migration SQL.

### Problème 2 (UX) : Aucune visibilité dans l'admin sur l'état de liaison
Dans **Admin > Design > Catégories**, il n'y a aucun indicateur qui montre si une catégorie a une page dédiée configurée ou non. L'utilisateur ne sait pas si "Femme" est liée à une page. Il faut afficher un badge vert/rouge et un bouton direct "Créer la page" ou "Ouvrir la page".

### Problème 3 (UX) : Le formulaire catégorie indique `/boutique/{slug}` comme URL
`CategoryFormDialog` affiche `lvtk6.com/boutique/{slug}` dans l'aperçu SEO — c'est faux, les catégories se trouvent à `/{slug}` (ex: `/homme`). Cela confond l'utilisateur.

### Problème 4 (UX) : Flux déconnecté entre Catégories et Pages
Créer une catégorie dans Admin > Design > Catégories ne crée **pas** automatiquement la page dédiée. L'utilisateur doit aller séparément dans Admin > Pages pour créer manuellement la page et la lier. Ce flux doit être automatisé.

---

## Plan de correction

### Fix 1 — Migration SQL (immédiat)
Corriger `category_id = NULL` sur la page "Femme" : `UPDATE pages SET category_id = 'be35aabf-...' WHERE slug = 'femme'`.

### Fix 2 — Indicateur de liaison dans Admin > Design > Catégories
Dans `SortableCategoryCard` / `CategoriesTab` dans `AdminDesign.tsx` : pour chaque catégorie, afficher :
- **Badge vert "Page liée"** si une page existe dans `pages` avec `category_id = cat.id`
- **Badge rouge "Aucune page"** + bouton **"Créer la page"** si aucune page
- Bouton **"Éditer la page"** si la page existe → ouvre directement l'édition

Pour ça, la `CategoriesTab` récupère aussi `usePages()` pour faire le matching.

### Fix 3 — Auto-création de page lors de la création d'une catégorie
Dans le `onSubmit` de `CategoriesTab` dans `AdminDesign.tsx` : après `createCategory.mutate(...)`, créer automatiquement une entrée dans `pages` avec `type: 'category'`, `slug: cat.slug`, `category_id: cat.id`, `is_published: true`.

### Fix 4 — Corriger l'aperçu URL dans `CategoryFormDialog`
Changer `lvtk6.com/boutique/{slug}` → `lvtk6.com/{slug}` dans l'aperçu Google du formulaire.

---

## Fichiers à modifier

| Fichier | Action |
|---|---|
| `supabase/migrations/` | Fix `category_id = NULL` sur page Femme |
| `src/pages/admin/AdminDesign.tsx` | (1) Badge liaison page par catégorie + bouton Créer/Éditer ; (2) Auto-créer page lors de création catégorie |
| `src/components/admin/CategoryFormDialog.tsx` | Fix URL aperçu SEO : `/boutique/{slug}` → `/{slug}` |

---

## Résultat

- Toutes les catégories (Homme, Femme, Enfant, Accessoire) mèneront vers leur page dédiée quand on clique sur la vignette
- Dans Admin > Design > Catégories, chaque vignette affiche clairement si sa page est configurée ou non
- Créer une nouvelle catégorie crée automatiquement sa page dédiée
- L'URL affichée dans le formulaire est la bonne (`/homme`, `/femme`, etc.)
