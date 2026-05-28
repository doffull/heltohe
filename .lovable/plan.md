# Refonte Premium — Templates de pages

## Objectifs

1. Presets visuels (avec aperçus images), import de presets JSON.
2. Corriger l'erreur d'enregistrement quand on monte/descend des blocs.
3. Gestion fluide : suppression, duplication, recherche, marquer comme défaut, aperçu.
4. UI admin premium.
5. Contrôle design 100 % : couleurs, typo (Google Fonts), espacements, rayons, ombres, padding global.
6. **Variantes par bloc** (gallery, description, find-size, CTA, sizes, prix…) sélectionnables au lieu de simples props.

---

## 1. Corriger le bug d'enregistrement après réorganisation

**Cause probable** : après `moveBlock` / changement de `col`/`span`, la mutation upsert renvoie une erreur (souvent contrainte `slug` unique conflictuelle lors d'un upsert répété, ou JSONB invalide quand un champ devient `undefined`).

**Fix** :
- Nettoyer le payload côté `useUpsertTemplate` (purger les `undefined`, garantir `layout.blocks` sérialisable).
- Afficher l'erreur Supabase exacte dans le toast (déjà fait mais souvent tronquée → log + détail).
- Ajouter une vérif côté UI : si le slug est vide, le régénérer automatiquement.
- Vérifier que la RLS / GRANT autorise bien `UPDATE` à l'admin connecté (lecture des policies actuelles).

## 2. Presets visuels + import

- Ajouter un champ `previewImage` (déjà présent dans le type) à chaque preset et générer 4 vignettes (via `imagegen`) représentant chaque style (Buggy, Minimal, Classic, Magazine) + 2 nouveaux presets : **Editorial** et **Showroom**.
- Carte preset = vignette image + nom + type + bouton "Utiliser ce preset".
- Nouveau bouton **Importer un preset** : upload `.json` validé par un schéma Zod léger → injecté comme nouveau template.
- Bouton **Exporter** sur chaque template existant (download JSON).

## 3. Gestion fluide des templates

- Barre d'actions par carte : Éditer · Dupliquer · Définir par défaut · Exporter · Supprimer (avec `AlertDialog` au lieu de `confirm`).
- Recherche + filtre par type (Produit / Catégorie).
- Indicateur visuel "défaut" plus marqué.
- Toast de succès + invalidation cache.

## 4. UI Premium

- Layout admin retravaillé : header sticky avec actions principales, grille de cartes avec hover élégant, ombres douces, transitions.
- Éditeur en plein écran (drawer/sheet large) au lieu d'un dialog cramped.
- Aperçu **live** à droite pendant l'édition (rend `ProductTemplateRenderer` avec un produit factice).
- Onglets : Infos · Thème · Typographie · Disposition · Variantes · Aperçu.

## 5. Contrôle design 100 %

Ajouter au type `TemplateTheme` :
- `spacing` (échelle), `radiusScale` (sm/md/lg), `shadowScale`.
- `fontHeading`, `fontBody` (sélection parmi ~15 Google Fonts ou import URL).
- `fontSizes` (xs→3xl).
- `containerWidth`, `sectionPaddingY`.

Editeur thème :
- Color pickers + saisie HEX.
- Sliders pour rayons / espacements / ombres.
- Sélecteur Google Fonts (pré-chargement dynamique via `<link>` injection lors du preview).

## 6. Variantes de blocs

Étendre `TemplateBlock` avec `variant?: string`. Chaque bloc a son catalogue :

- **gallery** : `classic-thumbs-left`, `grid-2x2`, `carousel-fullbleed`, `masonry`, `slider-dots`.
- **description** : `plain`, `accordion`, `tabs`, `bullet-features`, `magazine-drop-cap`.
- **find_size_btn** : `outline`, `pill-icon`, `link-underline`, `modal-cta`.
- **cta_add_to_cart** : `bold-block`, `outline-minimal`, `gradient`, `sticky-bottom`, `split-buy-now`.
- **sizes_selector** : `chips`, `dropdown`, `grid-bordered`, `compact-pill`.
- **price** : `large-bold`, `inline-strike`, `badge-discount`, `subscription-split`.
- **trust_badges** : `row-3`, `icons-only`, `stacked-list`, `marquee`.

Implémentation :
- `ProductTemplateRenderer` switch sur `b.variant` pour chaque type (fallback = variant actuelle).
- Dans l'éditeur de bloc : combobox des variantes + mini-preview.

## Schéma base de données

Aucune migration de schéma nécessaire (les colonnes `theme` et `layout` sont JSONB → toutes les extensions vivent dedans). Vérification : confirmer que les policies `page_templates` autorisent `UPDATE`/`DELETE` aux admins.

## Détails techniques

- Nouveaux fichiers :
  - `src/config/blockVariants.ts` (catalogue + métadonnées).
  - `src/components/admin/templates/PresetGallery.tsx`
  - `src/components/admin/templates/TemplateCard.tsx`
  - `src/components/admin/templates/TemplateEditorSheet.tsx` (remplace l'ancien Dialog)
  - `src/components/admin/templates/ThemeEditor.tsx`
  - `src/components/admin/templates/LayoutEditor.tsx`
  - `src/components/admin/templates/BlockVariantPicker.tsx`
  - `src/components/admin/templates/LivePreview.tsx`
  - `src/components/admin/templates/ImportExportButtons.tsx`
- Modifier :
  - `src/config/templatePresets.ts` (ajouter `previewImage`, 2 presets, `fontHeading/Body`, `spacing`).
  - `src/hooks/usePageTemplates.ts` (nettoyage payload, gestion erreurs détaillées).
  - `src/components/product/ProductTemplateRenderer.tsx` (support `variant`).
  - `src/pages/admin/AdminPageTemplates.tsx` (refonte UI).
- Assets : 6 images de preview générées dans `src/assets/template-presets/`.

## Hors scope (sera fait plus tard si demandé)

- Drag-and-drop visuel sur la grille (on garde flèches + numéros col/span pour stabilité).
- Templates pour autres types de pages (panier, checkout…).

---

Confirme et je passe en build.
