# Badges mobile discrets, mention enfant, catégories menu-only + icônes

## 1. Badges (Tendance, Nouveauté, Promo…) plus discrets sur mobile
- Sur les vignettes produit, en mobile : badges réduits (texte plus petit, moins de padding), sans animation brillante, opacité légèrement adoucie, et **1 seul badge maximum** affiché (le plus important : Épuisé > Promo > Nouveau > Top > Tendance).
- Repositionnement mobile : badge en haut à gauche mais plus compact, pour ne plus recouvrir le vêtement. En desktop, rien ne change (jusqu'à 3 badges, style glossy actuel).
- Le badge « Limited Edition » suit la même règle de compacité sur mobile.

## 2. Mention « Ni repris ni échangé » (articles enfant)
- Affichage **discret** : une petite ligne de texte en petites capitales grises (sans encadré rouge) sous le prix, sur la vignette produit et sur la fiche produit, pour tout article détecté comme enfant.
- Le panier conserve la mention actuelle (plus visible) puisque c'est le moment de la décision d'achat.

## 3. Catégories : visibilité « site » ou « menu camembert uniquement »
- Nouveau réglage par catégorie, 3 choix :
  - Partout (site + menu) — comportement actuel, par défaut
  - Menu uniquement — la catégorie n'apparaît plus dans les grilles de catégories du site, mais reste dans le méga menu
  - Site uniquement — absente du méga menu
- Les pages catégorie et les URLs restent accessibles dans tous les cas (aucun impact SEO / lien direct).
- Réglage éditable dans le formulaire de catégorie (admin).

## 4. Icônes / logos à côté des noms de catégories
- Nouveau champ « icône » par catégorie : soit une icône de la bibliothèque (jeu d'icônes Lucide, avec recherche), soit une image / logo uploadé depuis la médiathèque.
- L'icône s'affiche à gauche du nom de la catégorie dans : le méga menu, la grille de catégories de l'accueil, le fil d'Ariane des pages catégorie et les listes admin.
- Taille adaptée automatiquement (petite en menu/breadcrumb, moyenne dans les grilles).

## Détails techniques
- Migration `categories` : ajout de `icon text` (nom d'icône Lucide), `icon_image text` (URL médiathèque), `visibility text NOT NULL DEFAULT 'all'` avec contrainte `check (visibility in ('all','menu','site'))`.
- `useCategories.ts` : mapping `icon`, `iconImage`, `visibility` dans `CategoryRecord` + create/update.
- `CategoryFormDialog.tsx` : sélecteur d'icône (picker Lucide + upload via `FileDropZone`/médiathèque) et sélecteur de visibilité.
- Nouveau composant `CategoryIcon.tsx` (résout icône Lucide ou image), utilisé par `MegaMenu.tsx`, `CategoryGrid.tsx`, `CategoryPageRouter.tsx`, `AdminCategoryOrdering.tsx`.
- Filtrage visibilité : `MegaMenu` exclut `visibility === 'site'`, `CategoryGrid`/sections d'accueil excluent `visibility === 'menu'`.
- `ProductStatusBadges.tsx` : props `max`/`compact` pilotées par `useIsMobile()` dans `ProductCard.tsx`, variante `glossy-badge-static` + classes discrètes sur mobile.
- `KidsNoReturnNotice.tsx` : ajout d'une variante `variant="subtle"` (texte seul) utilisée par `ProductCard.tsx` et `ProductBuyBox.tsx` via `isKidsProduct()`.
