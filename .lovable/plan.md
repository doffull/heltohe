# Plan — Personnalisation sécurité, import images en masse, édition rapide produits, dispositions galerie

## 1. Gestion admin du filigrane anti-copie + désactivation super-admin

**Objectif** : rendre configurable depuis l'admin le texte de fond ("filigrane") et améliorer la protection écran, avec désactivation automatique pour les admins connectés.

- Ajouter dans `design_settings` (via migration) un bloc `security_overlay` :
  - `enabled` (bool), `text_mode` ("email" | "custom" | "brand"), `custom_text`, `opacity` (0.02–0.15), `angle` (-45 à 45°), `density` (10–80), `font_size`, `color` ("auto" | hex), `show_timestamp` (bool)
  - `disable_for_admin` (bool, défaut true), `printscreen_blur_enabled`, `printscreen_blur_ms`
- Nouvel onglet **Admin → Design → Sécurité & Protection** (ou dans `AdminSecurity.tsx`) avec un aperçu live du filigrane et sliders/toggles pour tous les paramètres.
- Refonte `ScreenshotWatermark.tsx` :
  - Lit la config depuis `useDesignSettings`.
  - Si l'utilisateur a le rôle `admin` (via `has_role`) → composant retourne `null`. Idem sur toute la zone `/admin`.
  - Applique dynamiquement opacité, angle, densité, texte et couleur (via variables CSS).
- Refonte `ImageProtection.tsx` :
  - Désactivé complètement pour les admins connectés.
  - Rétablir un anti-PrintScreen amélioré (Win/Mac/mobile via Page Visibility + `blur` court sur `visibilitychange` limité aux non-vidéos), configurable (durée, activation).
  - Détection des raccourcis Win+Shift+S (outil Capture Windows) et Cmd+Shift+3/4/5 déjà présente — élargir à Cmd+Ctrl+Shift+4 et fournir un fallback mobile (blur au `pagehide`).
- Vérification via Playwright : capture d'écran hors admin → floutée / filigranée ; en admin → propre.

## 2. Galerie d'images supplémentaires — sélection multiple

Dans `MediaLibraryDialog.tsx` (utilisé par `EditableImage` et le formulaire produit pour "Galerie d'images supplémentaires") :
- Ajouter un mode `multiSelect` piloté par le consommateur (checkbox par vignette + barre "N sélectionnées · Ajouter").
- Dans `ProductForm.tsx` (champ `galleryImages`) : brancher le mode multi et concaténer les URLs sélectionnées à la galerie existante.
- Conserver le mode simple pour l'image principale et les autres appels existants.

## 3. Import d'images produit en masse (matching par nom de fichier)

Nouveau bouton **"Importer images produits"** à côté de "Synchro WP" / "Market IA" dans `AdminProducts.tsx`.

Nouveau composant `BulkProductImagesDialog.tsx` :
- Drag-and-drop / sélection de N fichiers image.
- Pour chaque fichier, normalisation du nom (retirer extension, accents, `_`, `-`, espaces, chiffres finaux `_1`, `_2`…) puis matching contre les produits par :
  1. SKU exact
  2. `name` normalisé (slug)
  3. Similarité (Levenshtein / includes) — proposition manuelle si ambigu
- UI de revue : tableau `fichier → produit détecté` avec dropdown correctif, groupement par produit, désignation "image principale" (nom sans suffixe ou premier fichier) vs "galerie" (suffixes `_2`, `_3`…).
- Bouton **Importer** : upload dans le bucket `media`, puis `update products set image = ?, gallery_images = ?` pour chaque produit matché.
- Toast de progression (X/N fichiers uploadés, Y produits mis à jour, Z non appariés).

## 4. Édition inline & en masse — prix, SKU, catégorie

Créer un composant générique `InlineFieldEditor` inspiré de `InlineStockEditor` (types : `number`, `text`, `select`).

Dans `AdminProducts.tsx` (tableau produits) :
- Colonnes **Prix**, **SKU**, **Catégorie** → cliquables, édition inline (Enter valide, Escape annule), sauvegarde via `useUpdateProduct`.
- Édition en masse : sélection multiple (checkbox) déjà partiellement supportée via `useBulkSelection` + `useBulkUpdateProducts`. Ajouter une **barre d'actions groupées** avec :
  - "Modifier catégorie" (select des catégories existantes)
  - "Modifier prix" (valeur fixe, +%, -%, arrondi)
  - "Modifier stock" (via `AdminStock` bulk existant, ou dupliquer ici)
  - "Activer/Désactiver"

## 5. Six dispositions de galerie produits (premium)

Créer un système de **layout** pour les grilles produits, sélectionnable dans `Admin → Design` (nouveau champ `product_grid_layout` dans `design_settings`).

Six variantes (composants dans `src/components/products/layouts/`) :
1. **Minimal Grid** — 4 colonnes, blancheur, hover subtil (Aesop-like)
2. **Editorial Magazine** — grille asymétrique, gros visuels + titres serif (Instrument Serif)
3. **Bento Premium** — bento-grid avec produits vedette 2×2, animations tilt
4. **Techwear Card** — cartes sombres, angles 45°, hover glitch (aligné brand)
5. **Runway Masonry** — masonry en hauteurs variables, ratio portrait, overlay hover
6. **Immersive Split** — 2 colonnes plein écran, scroll horizontal snap sur desktop

Chaque layout consomme `Product[]` avec la même API que `ProductCard`. Sélecteur visuel avec aperçus miniatures dans l'admin. Appliqué à `Shop.tsx`, `CategoryPageRouter.tsx`, sections produits home.

## Détails techniques

- Migration SQL : ajouter colonnes `security_overlay` (jsonb) et `product_grid_layout` (text) sur `design_settings`.
- Rôle admin détecté via `has_role(auth.uid(), 'admin')` mis en cache dans `AuthContext`.
- `BulkProductImagesDialog` : normalisation `name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'')`.
- Upload : `useUploadMedia` réutilisé, en parallèle (concurrence 4).
- Aucune modification de la logique métier commande/paiement.

## Livrables

1. Onglet Admin Sécurité + filigrane paramétrable et désactivé pour admins.
2. Sélection multiple dans la médiathèque pour galerie produit.
3. Bouton "Importer images produits" avec matching intelligent.
4. Édition inline prix/SKU/catégorie + barre d'actions groupées produits.
5. Six layouts galerie premium sélectionnables.
