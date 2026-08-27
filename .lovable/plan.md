# Badge « Coming soon » automatique en rupture de stock

## Objectif

Tout produit dont le stock est à 0 affiche automatiquement un badge « COMING SOON » au lieu de « Épuisé », sans avoir à saisir un libellé produit par produit.

## Ce qui change

1. **Libellé par défaut du badge de rupture** : « Coming soon » remplace « Épuisé » pour le badge d'état (vignette boutique + fiche produit). Le badge reste automatique dès que le stock atteint 0 et que la case « Badge rupture de stock » du produit est cochée (cochée par défaut).
2. **Libellé global configurable** dans Admin → Badges produit : champ texte « Texte du badge de rupture » (valeur par défaut « Coming soon »), appliqué à tous les produits qui n'ont pas de libellé personnalisé.
3. **Priorité** : libellé du produit (si renseigné) > libellé global > « Coming soon ».
4. **Bouton d'ajout au panier** : sur la vignette boutique et la carte produit, le bouton indisponible affiche aussi « Coming soon » pour rester cohérent.

## Détails techniques

- `src/components/product/ProductStatusBadges.tsx` : `BADGE_DEFS.soldout.label` → « Coming soon » ; `ProductStatusBadges` lit `designSettings.soldOutBadgeLabel` comme repli avant le défaut.
- `src/hooks/useDesignSettings.ts` : lecture/écriture de `settings_json.soldOutBadgeLabel` (défaut « Coming soon »).
- `src/pages/admin/AdminProductBadges.tsx` : champ Input dans la carte « Badges d'état produit ».
- `src/components/admin/ProductForm.tsx` : placeholder du champ libellé → « Coming soon » (aucun changement de logique).
- `src/components/products/ProductCard.tsx` (ligne 302) et `src/pages/Shop.tsx` (ligne 511) : texte du bouton hors stock.
- Aucune migration : les colonnes `sold_out_badge` / `sold_out_label` existent déjà.
