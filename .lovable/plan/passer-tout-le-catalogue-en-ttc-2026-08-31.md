# Passer tout le catalogue en TTC

Deux volets : convertir une fois pour toutes les prix du catalogue (×1,20) et afficher la mention « TTC » partout où un prix est visible.

## 1. Conversion des prix (opération unique)

- Multiplier par 1,20 les prix `price` et `sale_price` de tous les produits, arrondi à 2 décimales.
- Opération unique et non réversible automatiquement : à ne lancer qu'une seule fois. Un produit à 100 € passera à 120 €.
- Les prix des variantes/déclinaisons stockés au niveau produit suivent la même règle.
- Les frais de port (domicile 15 €, relais 4,50 €) et le seuil de gratuité (99 €) restent inchangés : ils sont déjà TTC.
- Aucun changement sur les commandes déjà passées.

## 2. Mention « TTC » partout

Ajout d'un suffixe discret « TTC » à côté de chaque prix affiché :

- Fiche produit (prix principal, prix barré, prix promo)
- Vignettes produit de la boutique, accueil, produits liés, recherche, méga-menu, sidebar
- Panier et récapitulatif de commande (sous-total, total)
- Checkout (récapitulatif de paiement)
- Factures PDF/impression et étiquettes admin (« Total TTC » déjà présent, harmonisé)

Le calcul de TVA affiché reste « dont TVA (20 %) », déjà cohérent avec des prix TTC.

## Détails techniques

- Conversion via une commande de mise à jour en base sur `products` (`price`, `sale_price`), arrondie avec `round(...::numeric, 2)`.
- Affichage : petit composant utilitaire de formatage de prix (`formatPriceTTC`) utilisé dans `ProductCard.tsx`, `ProductInfo.tsx`, `ProductTemplateRenderer.tsx`, `ProductStrip.tsx`, `RelatedProducts.tsx`, `SearchDialog.tsx`, `MegaMenu.tsx`, `SidebarProductHUD.tsx`, `Cart.tsx`, `Checkout.tsx`.
- Aucune modification de `CartContext` : la TVA y est déjà dérivée d'un total TTC (`total × 0,20 / 1,20`).
- Les écrans admin d'édition de prix reçoivent le libellé « Prix TTC » sur les champs concernés.
