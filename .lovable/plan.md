# Édition inline double-clic — Couverture complète de la page produit

## Objectif
Toute donnée visible sur la page produit devient éditable en double-clic (Admin + Éditeur Live actif), avec la barre flottante ✓ Valider / ✕ Annuler déjà en place.

## Champs à couvrir (nouveaux)

### 1. `ProductInfo.tsx`
- **Info mannequin** (`modelName`, `modelHeight`, `modelSizeWorn`) — actuellement affiché comme phrase composée. Chaque valeur devient un `EditableProductField` en ligne dans la même phrase. Si tout est vide et qu'on est en mode éditeur, afficher un placeholder « + Ajouter un mannequin » pour créer.
- **Stock** (`stock`) — le badge « En stock / Plus que N » devient éditable (nombre). Double-clic sur la ligne → input numérique.

### 2. `ProductOptions.tsx` — Tailles et couleurs
- **Tailles** (`sizes: string[]`) : chaque pastille de taille éditable en double-clic (renomme la taille dans le tableau). Un bouton `+` visible uniquement en mode éditeur permet d'ajouter une taille ; un bouton `✕` au survol supprime. Sauvegarde via `useUpdateProduct` sur le champ `sizes`.
- **Couleurs** : label de couleur éditable via double-clic sur le tooltip/pastille (édite `colorOptions[i].label`). Ajout/suppression restent gérés dans l'admin produit existant (hors périmètre).

### 3. Badges de confiance (features bar)
Les labels des badges viennent de `designSettings.productTrustBadges` (globaux + surcharges par catégorie), **pas** du produit. Deux options que je propose de trancher dans le plan :
- **Retenu** : double-clic sur un label de badge → édite `designSettings.productTrustBadges.default[i].label` (ou l'override de la catégorie du produit s'il existe) via le mécanisme `useEditableSetting` déjà utilisé ailleurs. Toolbar ✓/✕ identique. Autosave via l'`AdminSaveBar` déjà globale.
- L'icône et l'ajout/suppression de badges restent gérés dans `/admin/badges-produits`.

### 4. Image principale et galerie
- Image principale : déjà couverte via `EditableProductImage target="cover"`.
- **Ajout** : wrapper `EditableProductImage target={{ galleryIndex: i }}` autour de chaque vignette de galerie dans `ProductImageGallery.tsx` pour permettre le remplacement individuel.

## Composants nouveaux
- `EditableProductArrayField` — même API que `EditableProductField` mais pour éditer une entrée d'un tableau (`field: 'sizes'`, `index: number`) avec support suppression. Utilisé pour les tailles et couleurs.
- Extension de `EditableProductField` pour accepter `parse`/`format` numériques déjà présents (stock).

## Composants modifiés
- `src/components/product/ProductInfo.tsx` — mannequin + stock inline.
- `src/components/product/ProductOptions.tsx` — tailles et couleurs éditables + bouton `+` admin.
- `src/components/product/ProductImageGallery.tsx` — wrap galerie avec `EditableProductImage`.
- `src/components/visual-editor/EditableProductArrayField.tsx` — nouveau.
- Badges : intégration légère dans `ProductInfo.tsx` avec `useEditableSetting` (aucun changement du modèle de données).

## Règles conservées
- Édition gated : admin + Éditeur Live ouvert (via `useVisualEditor`).
- Toolbar flottante ✓ Valider / ✕ Annuler, Entrée = valider, Échap = annuler.
- Sauvegarde immédiate côté produit via `useUpdateProduct` ; côté design settings via l'autosave global existant.
- Aucun changement de logique métier ni de schéma DB.

## Détails techniques
- Type `Product.sizes` reste `string[]`. Modifier une taille = remplacer l'entrée à l'index ; supprimer = filtrer.
- Pour la couleur, on édite `colorOptions[i].label` (les stocks liés à `colors[i]` restent inchangés — c'est un renommage d'affichage).
- Stock : `parse={(v) => Math.max(0, parseInt(v) || 0)}`.
- Badges : la surcharge écrit dans `designSettings.productTrustBadges.overrides[categoryKey]` si le produit a une catégorie, sinon dans `default`.

## Hors périmètre
- Éditer les icônes de badges (déjà dans `/admin/badges-produits`).
- Édition inline des avis clients, produits associés, boutons CTA (déjà couverts par le Visual Editor existant).
