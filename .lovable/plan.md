## Objectif

Permettre à l'admin (uniquement) de **double-cliquer** sur n'importe quel élément visible du site (texte, prix, badge, taille, image) pour l'éditer en place, avec un petit bouton **✓ Valider** / **✕ Annuler** à côté du champ. Modifications appliquées immédiatement (autosave existant).

## État actuel

- Un système « Éditeur Live » existe déjà : `VisualEditorProvider`, `InlineEditable`, `EditableText`, `EditableImage`, `EditableCta`.
- Il fonctionne sur le **Home** (via `designSettings.homeTexts`).
- Sur la page produit **rien n'est éditable inline** — les données (titre, prix, description, tailles, images) viennent de la table `products`, pas de `designSettings`.
- L'activation actuelle se fait par **simple clic** dans l'éditeur ouvert ; le user demande **double-clic**.

## Ce que je vais faire

### 1. Cœur — édition inline générique (double-clic + bouton valider)
- `InlineEditable.tsx` : passer d'un simple clic à un **double-clic** pour entrer en édition ; en mode édition afficher un mini toolbar flottant `✓ Valider` / `✕ Annuler` (au lieu de valider seulement à Enter/blur).
- Activation globale via un **FAB « Mode édition »** (visible uniquement pour un admin, `has_role admin`) qui bascule `VisualEditorProvider.isOpen`. Actuellement il n'apparaît qu'en ouvrant le panneau — on le rend disponible sur **toutes** les pages.
- Un léger contour pointillé apparaît au survol des éléments éditables quand le mode est actif, pour signaler ce qui est cliquable.

### 2. Nouveau — édition ancrée à un produit
Créer `src/components/visual-editor/EditableProductField.tsx` :
- Wrapper qui prend `product`, `field` (`name` | `subtitle` | `price` | `salePrice` | `description` | `material` | etc.), et rend l'enfant en lecture, ou un input/textarea + toolbar Valider/Annuler au double-clic (mode éditeur actif + admin).
- Persiste via le hook existant `useProducts().updateProduct(id, patch)` (déjà utilisé par l'admin) — patch minimal pour ne pas casser les images/galerie (cf. `appToDbProduct` déjà corrigé).
- Prix/salePrice : parsing numérique avec validation ; badges/tailles : édition par pastilles (chips) avec ajout/suppression inline.

Créer `EditableProductImage.tsx` : au double-clic sur une image de galerie ou l'image principale, ouvre la `MediaLibraryDialog` existante ou l'upload direct ; sauvegarde `products.image` / `products.gallery_images`.

Créer `EditableProductSizes.tsx` : chips de tailles cliquables → popover avec add/remove et réordonnancement.

### 3. Intégration dans les pages produit
- `src/components/product/ProductInfo.tsx` : envelopper titre, sous-titre, prix, prix barré, description, matière, badges (utilise déjà `getProductTrustBadges`) et bouton « Ajouter au panier » (label via `designSettings.homeTexts`).
- `src/components/product/ProductGallery.tsx` : envelopper images (dblclick → MediaLibrary).
- Chips tailles → `EditableProductSizes`.
- Les badges de confiance déjà éditables via `/admin/product-badges` ; on ajoute un **crayon inline** qui ouvre directement cette page dans un nouvel onglet quand on double-clique sur la barre de badges.

### 4. Extension aux autres pages (catégorie, home)
- Home : `EditableText` déjà en place ; on migre l'activation vers double-clic (via `InlineEditable`).
- Header nav / footer : envelopper les libellés déjà stockés dans `designSettings.headerNavItems` etc.
- Page catégorie : titre + description SEO stockés dans `categories` table — même wrapper que `EditableProductField` mais générique `EditableRowField` réutilisable (produits, catégories, pages).

### 5. Garde-fous
- Toute l'édition inline est **strictement conditionnée** à `isOpen && isAdmin` (via `useUserRole`), zéro overhead / zéro affordance pour les visiteurs.
- Aucune modification de schéma DB : on réutilise les colonnes existantes.
- L'autosave global `AdminSaveBar` continue de gérer `designSettings` ; les updates produits/catégories passent par les hooks existants qui persistent immédiatement en base.

## Fichiers touchés

- `src/components/visual-editor/InlineEditable.tsx` — double-clic + toolbar Valider/Annuler + outline hover.
- `src/components/visual-editor/VisualEditorToggle.tsx` — rendre le FAB toujours dispo pour admin.
- `src/components/visual-editor/EditableProductField.tsx` (nouveau).
- `src/components/visual-editor/EditableProductImage.tsx` (nouveau).
- `src/components/visual-editor/EditableProductSizes.tsx` (nouveau).
- `src/components/visual-editor/EditableRowField.tsx` (nouveau, générique produits/catégories/pages).
- `src/components/product/ProductInfo.tsx` — enrobage.
- `src/components/product/ProductGallery.tsx` — enrobage images.
- (Home / Header / Category : petites migrations de simple-clic → double-clic.)

## Détails techniques

- Le toolbar « Valider/Annuler » est un `<div>` en position absolue rendu juste au-dessus du champ (`top:-2rem right:0`), avec deux `<Button size="icon">` (icônes `Check`, `X`) et raccourcis clavier Enter=valider, Esc=annuler.
- `EditableProductField` mémorise la valeur locale pendant l'édition puis appelle `updateProduct(id, { [field]: parsed })` sur Valider.
- Détection admin : hook `useUserRole()` déjà présent (vu dans `AdminProductBadges`). Fallback : ne monter le provider que dans le layout site (déjà fait).
- Aucun impact sur les visiteurs anonymes ni le SEO (le DOM en lecture reste inchangé).