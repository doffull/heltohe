# Audit global responsive + grand ménage

Objectif : rendre le site 100% utilisable sur mobile (iPhone SE 320px → Pro Max 430px, Samsung 360–412px), tablette, desktop, et cohérent sur Chrome / Firefox / Safari / Edge. Corriger les bugs bloquants, nettoyer le code mort.

## Phase 1 — Correctifs bloquants (priorité absolue)

### 1. Roue "Gratte & Gagne" (RouletteFab) — bug bloquant mobile
- **Problème** : `DialogContent` utilise `max-w-lg` sans `max-h` ni scroll → sur mobile la modal déborde, le bouton fermer sort de l'écran, le client est piégé.
- **Correctif** :
  - `max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto`
  - Bouton "Fermer" visible (X custom en `absolute top-2 right-2 z-50`, taille 44×44px tactile)
  - Roue : `aspect-square w-full max-w-[280px] mx-auto` (au lieu de taille fixe)
  - Textes des segments : `text-[10px] sm:text-xs`, rotation + ellipsis pour ne pas déborder
  - Padding réduit (`p-4 sm:p-6`)
  - Bloquer le scroll body quand ouverte uniquement (déjà géré par Radix)

### 2. Tous les Dialogs / Sheets / Drawers du projet
- Auditer chaque `DialogContent` (cart, auth, size guide, size guide AI, category, newsletter popup, FAB editor, etc.)
- Pattern standard appliqué partout :
  ```
  max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto
  ```
- Ajouter `DialogDescription` ou `aria-describedby` (warning console actuel)

### 3. Header / MiniNavbar
- Sur 360px : vérifier que les icônes ne sortent pas, hamburger toujours visible
- `min-w-0`, `truncate`, `shrink-0` sur les bons éléments
- HUDOverlays (`HUDStats`, `HUDUnitID`) déjà en `hidden lg:block` ✓

### 4. Overflow horizontal global
- Ajouter `overflow-x-hidden` sur `<body>` et `#root` (sécurité)
- Audit `rg "w-screen|100vw"` → remplacer par `w-full` quand approprié
- Vérifier toutes les grilles `grid-cols-*` ont une variante mobile

## Phase 2 — Audit page par page (mobile 360px → desktop 1920px)

Pages auditées et corrigées :
- `/` Home (hero, catégories, parallax, products, loyalty, newsletter)
- `/boutique` + `/boutique/:id` (galerie produit, options, sticky CTA mobile)
- `/categorie/:slug` (CategoryPageRouter)
- `/panier`, `/checkout` (formulaires, étapes)
- `/auth`, `/compte/*` (formulaires, tableaux orders)
- `/fidelite`, `/contact`, `/about`
- `/admin/*` (déjà desktop-first, ajouter avertissement "Mieux sur desktop" + scroll horizontal sur tables)
- Pages légales (CGV, mentions, etc.)

Checklist appliquée à chaque page :
- Aucun débordement horizontal
- Textes lisibles (≥ 14px body)
- Boutons tactiles ≥ 44×44px
- Images `max-w-full h-auto`
- Tables → `overflow-x-auto` wrapper
- Forms : `w-full`, labels visibles, focus visible

## Phase 3 — Cohérence cross-browser

- `-webkit-backdrop-filter` ajouté partout où `backdrop-blur` est utilisé (Safari)
- `100dvh` au lieu de `100vh` pour les héros (mobile Safari/Chrome address bar)
- Remplacer `aspect-[X/Y]` dynamiques par classes statiques (Safari ancien)
- Ajouter polyfill / fallback pour `gap` dans flex (Safari < 14)
- Tester `clip-path` chamfer-hud → fallback `border-radius` si non supporté
- `font-display: swap` sur fonts custom
- Meta viewport vérifié (`width=device-width, initial-scale=1, viewport-fit=cover`)
- `safe-area-inset` sur les FABs et headers (iPhone notch)

## Phase 4 — Grand ménage (code mort)

- `SidebarNewsletter.tsx` (plus importé) → supprimé
- Composants non référencés détectés via `rg` → supprimés
- Imports inutilisés → nettoyés
- `App.css` (logo Vite par défaut) → nettoyé
- Console warnings (`DialogContent` aria) → corrigés
- `console.log` de debug → retirés

## Phase 5 — Rapport final

Document `AUDIT_REPORT.md` à la racine listant :
- Bugs trouvés (avec sévérité) + fix appliqué
- Pages testées avec captures avant/après aux 3 viewports
- Recommandations restantes (ex : tests E2E, monitoring Sentry)
- Améliorations UX suggérées

## Détails techniques

Fichiers principalement modifiés :
- `src/components/home/RouletteFab.tsx` (critique)
- `src/components/ui/dialog.tsx`, `sheet.tsx`, `drawer.tsx` (defaults responsive)
- `src/components/ui/mini-navbar.tsx`, `src/components/layout/*`
- `src/index.css` (overflow-x-hidden, safe-area, dvh)
- `src/views/*`, `src/pages/*` (passes responsive ciblées)
- Suppression : `src/components/layout/SidebarNewsletter.tsx`, `src/App.css` nettoyé

Tests :
- Browser tool : iPhone 14 (390×844), Galaxy S20 (360×800), iPad (768×1024), Desktop (1440×900)
- Vérification visuelle de chaque page principale
- Screenshots avant/après dans le rapport

## Ce que je NE fais PAS (pour rester focus)
- Refonte design profonde des sections (le style "Industrial Luxury" est conservé)
- Nouvelles features
- Refacto backend / RLS
- Changements de logique métier

Vu l'ampleur (15+ pages, multiples composants), je procéderai par lots : Phase 1 (bloquants) → Phase 2 par sections → ménage → rapport. Si tu veux que je découpe en plusieurs livraisons plus petites, dis-le moi.
