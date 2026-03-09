
## Analyse

La capture montre la section "EN VEDETTE" sur la page d'accueil avec 3 produits (VANCOUVER, ATLANTA, GFHJG). L'utilisateur veut :
1. **Afficher les swatches de couleur sous chaque produit** dans les cartes de la page d'accueil (ProductSections) et la boutique (Shop.tsx)
2. **Cliquer sur une couleur → l'image du produit sur la carte change** vers l'image de cette variante (si disponible), avec feedback visuel immédiat

## État actuel

- `ProductCard.tsx` : a DÉJÀ des swatches + logique `hoveredColor` → change image au survol. **Mais** la `ProductSections` ne passe **pas** `onAddToCart`, donc le footer n'est pas visible. Et Shop.tsx utilise son propre JSX inline sans `ProductCard`.
- Le problème : Shop.tsx **ne réutilise pas** `ProductCard` — il a son propre JSX dupliqué sans swatches ni changement d'image sur couleur.
- `ProductSections` utilise bien `ProductGrid` → `ProductCard`, donc les swatches sont déjà là avec hover. Mais **le clic** ne fait que hover, pas de sélection persistante au clic.

## Ce qu'il faut faire

### 1. `ProductCard.tsx` — Passer de hover à clic sélectionnable
- Ajouter `selectedColor` en state (clic persistant)
- Au clic sur un swatch : `setSelectedColor(index)` + l'image change immédiatement
- Ajouter un effet de transition sur l'image (fade) quand la couleur change
- Afficher le label de la couleur sélectionnée en badge sur la carte
- Clic sur la même couleur = déselectionne

### 2. `ProductSections.tsx` — Passer `onAddToCart`
- Actuellement `ProductGrid` ne reçoit pas `onAddToCart` → pas de bouton "Ajouter au panier"
- Récupérer `addItem` du CartContext + `toast` et le passer

### 3. `Shop.tsx` — Remplacer le JSX inline par `ProductCard`
- Le JSX de Shop.tsx duplique la logique sans swatches
- Remplacer les cartes grid par `ProductCard` avec `onAddToCart` et `onClick`
- Garder le mode liste séparé (il est différent)

## Fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/components/products/ProductCard.tsx` | Hover → clic sélectionnable, transition image, badge couleur active |
| `src/components/home/ProductSections.tsx` | Passer `onAddToCart` au ProductGrid |
| `src/pages/Shop.tsx` | Vue grid → utiliser `ProductCard` au lieu du JSX inline |
