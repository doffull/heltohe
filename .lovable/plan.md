
# Page Builder Avancé — Pages Produit & Catégorie personnalisables

## Objectif

Créer dans l'admin un espace permettant de :
1. Concevoir des **templates de pages Produit** (et Catégorie) avec disposition libre des blocs fonctionnels (galerie, titre, prix, tailles, quantité, bouton panier, description, badges…).
2. Choisir parmi des **presets de disposition** et des **thèmes visuels** prêts à l'emploi.
3. Uploader une **maquette (image / HTML / PDF)** et laisser **l'IA** reproduire la disposition, les couleurs et les fonctionnalités automatiquement.
4. Livrer un **preset "Buggy"** (basé sur le HTML fourni) immédiatement utilisable.

---

## 1. Architecture des données

Nouvelle table `page_templates` (migration) :
- `id`, `name`, `slug`, `type` (`product` | `category`), `is_default boolean`
- `theme jsonb` (couleurs, typographies, radius, ombres, etc.)
- `layout jsonb` (grille + position de chaque bloc fonctionnel)
- `created_at`, `updated_at`
- RLS : lecture publique, écriture admin uniquement
- GRANTS standards (anon SELECT, authenticated CRUD, service_role ALL)

Sur la table `products`, ajouter une colonne optionnelle `template_id uuid` (override par produit). Idem pour `categories.template_id`.

Un **template par défaut** (`is_default = true`) s'applique si rien n'est défini.

---

## 2. Système de blocs fonctionnels (Produit)

Liste des blocs disponibles (chacun = composant React déjà utilisé dans `ProductDetail`) :
- `gallery` (images + thumbnails + zoom + flèches)
- `breadcrumb`
- `category_tag`, `sku`, `title`, `collab_subtitle`
- `price`, `stock_status`
- `model_info` (mannequin porte taille…)
- `find_size_btn` (IA)
- `trust_badges` (livraison, garantie, retours)
- `description`, `material`
- `sizes_selector`
- `quantity_selector`
- `cta_add_to_cart`, `btn_wishlist`, `btn_share`
- `related_products`
- `custom_html` (bloc libre)

Chaque bloc a : `id`, `type`, `gridPosition` (col-start, col-span, row-start, row-span), `visible`, `props` (styles inline overrides).

---

## 3. Éditeur visuel `/admin/page-templates`

Nouvelle page admin (route + entrée sidebar "Templates Pages") avec :
- Liste des templates existants (filtre par type)
- Bouton "Nouveau template" (Produit / Catégorie)
- **Éditeur drag & drop** :
  - Canvas central représentant la page (responsive switcher mobile/desktop)
  - Grille 12 colonnes avec snap
  - Palette latérale des blocs disponibles (drag-to-add)
  - Panneau "Inspecteur" : édition des props/styles du bloc sélectionné
  - Onglet **Thème** : couleurs primaires, accent, fond, typo, radius, ombres → sauvé dans `theme`
  - Onglet **Presets** : sélection rapide ("Buggy", "Minimal", "Magazine", "Boutique Classique")
  - Bouton **Aperçu en direct** (ouvre la page produit demo avec ce template)
  - **Save All** (pattern déjà utilisé pour Home Icons)

Drag & drop : `@dnd-kit` déjà présent dans le projet.

---

## 4. Presets fournis (seeds)

Au moins 4 presets insérés via migration :
- **Buggy** — reproduit fidèlement le HTML fourni (2 colonnes, galerie sticky gauche, panneau droit scrollable, badges trust en grille 3 col, accent rouge `#e63c2f`).
- **Minimal** — pleine largeur, galerie en haut, infos centrées dessous.
- **Magazine** — galerie asymétrique + texte éditorial.
- **Boutique Classique** — l'actuel `ProductDetail`.

---

## 5. Import de maquette par IA

Nouvelle section "Importer une maquette" dans l'éditeur :
- Upload d'une image (PNG/JPG), d'un PDF, ou collage de HTML.
- Edge Function `template-from-mockup` (Lovable AI Gateway, `google/gemini-2.5-pro` pour vision multimodale) :
  - Prompt système : analyse la maquette et retourne un JSON conforme à notre schéma `{ theme, layout: [blocs…] }`.
  - Tool calling avec schéma strict pour garantir la structure.
  - Mapping des éléments détectés (titre, prix, bouton panier…) vers nos blocs fonctionnels.
- L'utilisateur reçoit un **brouillon de template** prérempli, modifiable dans l'éditeur avant sauvegarde.
- Gestion 429/402 surfacée par toast.

---

## 6. Rendu côté boutique

Refactor de `src/pages/ProductDetail.tsx` :
- Chargement du `template` applicable (override produit > template défaut).
- Nouveau composant `<ProductTemplateRenderer template={…} product={…} />` qui :
  - Applique `theme` via CSS variables scoped.
  - Itère sur `layout.blocks` et instancie chaque bloc fonctionnel à sa position grille.
- Aucune perte de fonctionnalité : tous les hooks (panier, tailles, IA size, etc.) restent branchés sur les blocs existants.

Idem pour les pages Catégorie via `CustomPage` / `BoutiqueRouter`.

---

## 7. Fichiers à créer / modifier

**Nouveaux**
- `supabase/migrations/<ts>_page_templates.sql`
- `supabase/functions/template-from-mockup/index.ts`
- `src/hooks/usePageTemplates.ts`
- `src/pages/admin/AdminPageTemplates.tsx`
- `src/components/admin/page-templates/TemplateEditor.tsx`
- `src/components/admin/page-templates/BlockPalette.tsx`
- `src/components/admin/page-templates/BlockInspector.tsx`
- `src/components/admin/page-templates/ThemeEditor.tsx`
- `src/components/admin/page-templates/MockupImportDialog.tsx`
- `src/components/product/ProductTemplateRenderer.tsx`
- `src/components/product/blocks/*` (un fichier par bloc fonctionnel)
- `src/config/templatePresets.ts` (Buggy + autres)

**Modifiés**
- `src/pages/admin/Admin.tsx` — ajout route + item sidebar
- `src/pages/ProductDetail.tsx` — utilisation du renderer
- `src/integrations/supabase/types.ts` (auto)

---

## Détails techniques

```text
page_templates
├── theme: { colors:{primary,accent,bg,fg,muted}, font, radius, shadow }
└── layout: {
      grid: { cols: 12, gap: 16, breakpoints: {…} },
      blocks: [
        { id, type, col, span, row, rowSpan, visible, props }
      ]
    }
```

Edge Function `template-from-mockup` retourne ce même JSON via tool calling — garantie de validité.

---

## Hors scope (pour rester focalisé)

- Versioning / historique des templates (peut être ajouté plus tard).
- A/B testing entre templates.
- Marketplace de templates partagés entre utilisateurs.

Confirmez ce plan et je l'implémente.
