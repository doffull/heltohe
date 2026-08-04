# Badge « LIMITED EDITION » + sous-titre Collab

## Objectif
1. Une case à cocher « Édition limitée » sur chaque produit dans l'admin.
2. Quand elle est cochée, un badge « LIMITED EDITION » s'affiche sur la vignette produit et sur la fiche produit.
3. Tous les produits existants de la catégorie « Collab » reçoivent le sous-titre « HELVETICA MOUNTAIN PIONEERS X PEGASHOES » et le badge activé.

## Ce qui sera fait

### Base de données
- Ajout d'un champ « édition limitée » (vrai/faux, faux par défaut) sur les produits.
- Mise à jour des produits de la catégorie Collab : sous-titre renseigné et édition limitée activée.

### Admin produits
- Case à cocher « Édition limitée (badge LIMITED EDITION) » dans le formulaire produit, à côté des autres options.
- Par défaut cochée automatiquement lorsqu'on crée un produit dans la catégorie Collab (modifiable).

### Affichage boutique
- Vignette (`ProductCard`) : badge noir/blanc `LIMITED EDITION` dans la pile de badges en haut à gauche, style Industrial Luxury (angles biseautés, mono, majuscules, sans arrondi).
- Fiche produit (`ProductHeaderBlock`) : même badge à côté du titre, cohérent avec le badge « IA ».

## Détails techniques
- Migration : `ALTER TABLE public.products ADD COLUMN limited_edition boolean NOT NULL DEFAULT false;` puis `UPDATE` des lignes `category = 'Collab'` (sous-titre en majuscules, trigger existant respecté).
- `src/types/index.ts` : `limitedEdition?: boolean` sur `Product`.
- `src/hooks/useProducts.ts` : mapping `dbToAppProduct` + entrée `FIELD_MAP` (`limited_edition`), pour ne pas casser les mises à jour partielles.
- `src/components/admin/ProductForm.tsx` : `Switch`/`Checkbox` lié au champ, pré-cochage si catégorie Collab.
- `src/components/products/ProductCard.tsx` et `src/components/product/ProductHeaderBlock.tsx` : rendu du badge (tokens sémantiques uniquement, pas de couleurs codées en dur).
