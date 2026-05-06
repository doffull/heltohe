## Hero Techwear mobile + protection des images

### 1. Hero Techwear — mobile

**Décalage sous le header** (`src/styles/home-techwear.css`)
- Lire la hauteur réelle du header (56px mobile / 80px desktop) et l'appliquer à `padding-top` du `#hw-hero` au lieu de `min-height: 100vh - 70px`.
- Sur mobile (≤768px) : `padding-top: 64px` ; ≤480px : `padding-top: 60px`.
- Réduire `min-height` à `calc(100svh - 64px)` pour ne plus chevaucher Categories.

**Retrait du logo dans le Hero**
- Dans `TechwearHero.tsx` (`hw-card-logo`), supprimer le rendu du logo (img + fallback texte). Le header s'en charge déjà.

**Inversion de l'ordre des panneaux droits**
- Dans `TechwearHero.tsx`, réordonner les panneaux : 1) couleurs, 2) tailles, 3) stats (au lieu de stats → couleurs → tailles).
- Sur mobile, ajuster les `animation-delay` correspondants dans le CSS pour refléter le nouvel ordre.

**Compactage couleurs/tailles + stock visible**
- Couleurs : passer en grille horizontale compacte sur mobile (`flex-wrap`, swatches ronds 22px, libellé en tooltip + nom court sous le swatch sélectionné). Sous chaque swatch : pastille colorée (vert ≥10, orange 1-9, rouge 0) + nombre de stock total pour cette couleur.
- Tailles : passer en grille de pills compactes (chip 36×36) sans la colonne "Size" répétée. Sous chaque taille : pastille + nombre selon la couleur active. Tailles à 0 : barrées et désactivées.

**Source du stock**
- Nouveau hook `src/hooks/useProductStock.ts` qui interroge `inventory` + `stock_levels` pour `productId` et retourne `{ bySize: Record<size, qty>, byColor: Record<color, qty>, bySizeColor: Record<"size|color", qty> }`. Quantité disponible = `quantity - reserved`.
- Schema actuel `stock_levels` n'a pas de colonne `color` — on agrège par `size` uniquement, et on calcule `byColor` à partir des `colorOptions` du produit (somme par couleur si une convention existe ; sinon afficher le total inventory comme stock couleur). Pour rester correct sans migration : afficher la pastille **uniquement par taille**. Pour les couleurs : pastille verte si `total > 0`, grise si `0`.
- Le hook n'est appelé que si `config.productId` est défini ; sinon pastilles masquées.

### 2. Protection des images (niveau maximum)

Nouveau composant global `src/components/security/ImageProtection.tsx` monté dans `src/App.tsx` :
- Bloque `contextmenu`, `dragstart`, `selectstart`, `copy` au niveau document.
- Bloque les raccourcis : `F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U`, `Ctrl+S`, `Cmd+Opt+I/J/C`, `Cmd+S`.
- Détection DevTools (différence `outerHeight - innerHeight > 200`) → overlay d'avertissement (non bloquant, juste dissuasif).

Styles globaux dans `src/index.css` :
```css
img { -webkit-user-drag: none; user-select: none; pointer-events: none; }
img[data-allow-interact] { pointer-events: auto; }
.protected-image-wrap { position: relative; }
.protected-image-wrap::after {
  content: ''; position: absolute; inset: 0; z-index: 2;
  background: transparent; pointer-events: auto;
}
```
- L'overlay transparent empêche "Enregistrer l'image sous". Les boutons (swatches couleurs ProductCard) restent au-dessus via `z-index` et l'overlay sera appliqué via une classe `.protected-image-wrap` posée sur les conteneurs d'images du Hero, ProductCard et ProductImageGallery.
- Le swatch couleur du Hero qui change l'image n'utilise pas l'image elle-même comme cible : pas d'impact.

### 3. Validation

- Tests visuels mobile 360×621 et 414×896 : Hero ne déborde plus, ordre couleurs/tailles → stats, pastilles stock visibles.
- Test ProductDetail : vérifier que clic-droit/sélection bloqués mais ajout au panier fonctionne.

### Fichiers touchés

- `src/styles/home-techwear.css` (mobile padding, animation-delays, panel order, sizes/colors compacts)
- `src/components/home/TechwearHero.tsx` (suppr logo, réordonne panels, intègre stock pastilles)
- `src/hooks/useProductStock.ts` (nouveau)
- `src/components/security/ImageProtection.tsx` (nouveau)
- `src/App.tsx` (mount ImageProtection)
- `src/index.css` (règles globales images)
- `src/components/products/ProductCard.tsx` + `src/components/product/ProductImageGallery.tsx` (classe `protected-image-wrap`)
