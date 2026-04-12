

## Plan : Responsive mobile storefront + Amélioration zoom produit + Scroll vers photo

### Problèmes identifiés

1. **Panier (`Cart.tsx`)** — Le header avec titre + bouton "Vider" déborde sur mobile (flex horizontal)
2. **Checkout (`Checkout.tsx`)** — Le titre "FINALISER LA COMMANDE" et certaines sections dépassent 360px
3. **Boutique/Catégories (`Shop.tsx`)** — Les boutons catégories (Tout, Homme, Femme, Enfant, Accessoires) ne tiennent pas sur une ligne mobile, pas assez compacts
4. **Produit (`ProductDetail.tsx` + `ProductImageGallery.tsx`)** — Le scroll au changement de couleur arrive en haut du `div` au lieu de centrer sur la photo ; le zoom est limité à ×2.5 et peu intuitif sur mobile (pas de pinch-to-zoom)

### Corrections prévues

**A. Cart.tsx — Responsive mobile**
- Header : empiler titre et bouton "Vider" en `flex-col` sur mobile
- Réduire le titre à `text-xl` sur mobile
- Le layout grid est déjà `lg:grid-cols-3` donc OK

**B. Checkout.tsx — Responsive mobile**
- Titre : `text-xl sm:text-3xl`
- Progress steps : réduire le gap et masquer les labels sur très petit écran
- Summary sidebar : s'assurer qu'elle passe en pleine largeur sur mobile (déjà `lg:grid-cols-3`)

**C. Shop.tsx — Catégories compactes et colorées**
- Réduire le padding des boutons catégories : `px-2.5 py-1.5 text-[10px]` sur mobile pour tout tenir sur ~2 lignes max
- Ajouter une variante visuelle plus légère (fond teinté) pour les boutons non sélectionnés
- Cacher la double barre de filtre (Select catégorie + boutons catégories) : sur mobile, ne garder que les boutons compacts

**D. ProductImageGallery.tsx — Zoom amélioré + scroll précis**
- Augmenter le zoom à ×3.5 au lieu de ×2.5
- Sur mobile : activer le zoom au double-tap (pas au simple clic qui est maladroit sur tactile)
- Ajouter un état "zoomed" qui affiche l'image en plein écran (overlay) avec possibilité de pinch-to-zoom via `touch-action: manipulation`

**E. ProductDetail.tsx — Scroll vers la photo**
- Modifier `scrollToImage` pour utiliser `block: 'center'` au lieu de `'start'` afin d'arriver pile sur la photo
- Ajouter un léger offset négatif avec `scrollMarginTop` sur le ref pour compenser le header fixe

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/Cart.tsx` | Header responsive, titre réduit mobile |
| `src/pages/Checkout.tsx` | Titre + steps responsive |
| `src/pages/Shop.tsx` | Boutons catégories compacts, couleurs plus claires |
| `src/components/product/ProductImageGallery.tsx` | Zoom ×3.5, fullscreen overlay mobile, double-tap |
| `src/pages/ProductDetail.tsx` | scrollIntoView `block: 'center'`, scrollMarginTop |

