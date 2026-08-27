# Badge « Épuisé » activable produit par produit

## Objectif

Le badge d'état « Épuisé » existe déjà (il apparaît automatiquement quand le stock tombe à 0, si les badges d'état sont activés globalement). Ce qui manque : pouvoir décider **produit par produit** si ce badge de rupture de stock s'affiche ou non, via une case à cocher dans la fiche produit de l'admin.

## Ce qui sera ajouté

1. **Case à cocher dans le formulaire produit** (section badges, à côté de « Limited Edition ») :
   - « Afficher le badge Rupture de stock » (activée par défaut)
   - Champ texte optionnel pour personnaliser le libellé (défaut : « Épuisé »)
2. **Affichage** : le badge de rupture n'apparaît sur la vignette boutique et la fiche produit que si la case est cochée pour ce produit, le stock est à 0, et les badges d'état sont activés globalement.
3. **Réglage global** dans Admin → Badges produit : valeur par défaut appliquée aux produits qui n'ont pas encore de choix explicite, et rappel que l'interrupteur « Badges d'état produit » commande l'ensemble.
4. **Édition en masse** : ajout de l'option activer/désactiver le badge de rupture dans la boîte de modification groupée des produits.

## Détails techniques

- Migration : `products.sold_out_badge boolean not null default true` et `products.sold_out_label text` (nullable).
- `src/types/index.ts` : `soldOutBadge?: boolean`, `soldOutLabel?: string`.
- `src/hooks/useProducts.ts` : mapping DB ↔ app dans le mapper de lecture et la table de colonnes d'écriture.
- `src/components/product/ProductStatusBadges.tsx` : `getProductBadges` n'ajoute `soldout` que si `product.soldOutBadge !== false`; libellé pris de `soldOutLabel` sinon « Épuisé ».
- `src/components/admin/ProductForm.tsx` : champ dans l'état du formulaire + UI (Switch + Input) dans le bloc badges existant.
- `src/components/admin/BulkEditDialog.tsx` : nouveau champ optionnel appliqué à la sélection.
- `src/pages/admin/AdminProductBadges.tsx` : carte « Badges d'état produit » enrichie avec le défaut global (`design_settings.settings_json.soldOutBadgeDefault`) utilisé par le formulaire à la création.
