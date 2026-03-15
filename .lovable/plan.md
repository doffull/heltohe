
## Audit Total + Corrections — Plan

### Bugs identifiés avant même l'audit

**Bug 1 — React warning actif dans les logs** : `CompleteLook` et `RelatedProducts` dans `ProductDetail.tsx` génèrent des warnings "Function components cannot be given refs". `CompleteLook` est défini **à l'intérieur** du fichier mais après le return principal (lignes 191-277). Le wrapper `motion.section` reçoit un composant non-forwardRef. À corriger.

**Bug 2 — Catégories home.tsx pointent vers `/boutique/xxx`** : Dans `Home.tsx` ligne 322, les catégories DB sont linkées vers `/boutique/${c.slug}` au lieu de `/${c.slug}`. La route correcte est `/:categorySlug` → `CategoryPageRouter`. Les liens catégorie de la home redirigent vers `BoutiqueRouter` qui ne sait pas gérer les slugs comme "homme" → il tombe sur le Shop générique au lieu de la page catégorie dédiée.

**Bug 3 — FALLBACK_CATEGORIES dans Home.tsx** (lignes 39-43) pointent aussi vers `/boutique/homme` etc. au lieu de `/homme`.

**Bug 4 — `generate_category_slug` trigger** : Le translate dans la migration précédente a un bug — la correspondance est déséquilibrée (`'aaaeeeeiioouuycAAARRREEEIIOOUUUYC'` vs `'àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ'`) → risque de mauvaise translittération ou erreur.

**Bug 5 — `CompleteLook` component** défini au milieu du fichier après les exports, sans être un composant de premier niveau propre. Le warning React vient de `motion.section` au lieu de `motion.div`.

### Composant d'audit in-app : `AdminAudit`

Un tableau de bord d'audit accessible via `/admin` (bouton "Audit" dans la nav admin) qui :
1. Vérifie toutes les **routes** du site (GET fetch + vérif du status)
2. Vérifie les **redirections catégories** (homme, femme, enfant, accessoires)
3. Vérifie la **DB** (products count, categories count, pages count, orders count)
4. Vérifie les **liens du header/nav** 
5. Vérifie **upload storage** (bucket media accessible)
6. Exécute des **vérifications UI** (panier, checkout, auth)

Chaque test affiche : ✅ PASS | ❌ FAIL | ⚠️ WARN avec détails.

```text
┌─────────────────────────────────────────────────────┐
│  Admin > Audit Système                               │
│                                                      │
│  [▶ Lancer l'audit complet]                         │
│                                                      │
│  ROUTES & REDIRECTIONS                              │
│  ✅ / (Home)               200ms                    │
│  ✅ /boutique               145ms                   │
│  ✅ /homme → CategoryPage   220ms                   │
│  ❌ /boutique/homme → Shop  (mauvaise route)        │
│                                                      │
│  BASE DE DONNÉES                                    │
│  ✅ Produits: 12            ✅ Catégories: 4        │
│  ✅ Pages: 4                ⚠️ Commandes: 0         │
│                                                      │
│  BUGS DÉTECTÉS                                      │
│  ❌ 3 liens catégories pointent vers /boutique/xxx  │
│     au lieu de /xxx                                 │
│  ⚠️ Warning React: CompleteLook (refs)              │
└─────────────────────────────────────────────────────┘
```

### Corrections incluses dans cette implémentation

| # | Problème | Fix |
|---|---|---|
| 1 | `Home.tsx` : liens catégories DB → `/boutique/${slug}` | Corriger vers `/${slug}` |
| 2 | `Home.tsx` : FALLBACK_CATEGORIES → `/boutique/homme` | Corriger vers `/homme` |
| 3 | `ProductDetail.tsx` : `CompleteLook` déclenche warning ref | Déplacer hors du fichier principal ou corriger le motion wrapper |
| 4 | Trigger `generate_category_slug` : chaîne translate déséquilibrée | Corriger migration |

### Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/pages/Home.tsx` | Fix liens catégories DB + FALLBACK_CATEGORIES |
| `src/pages/ProductDetail.tsx` | Fix `CompleteLook` warning React ref |
| `src/pages/admin/Admin.tsx` | Ajouter entrée "Audit" dans SIDEBAR_ITEMS |
| `src/pages/admin/AdminAudit.tsx` | Nouveau composant d'audit complet |
| `supabase/migrations/` | Fix trigger translate déséquilibré |

### Portée de l'audit automatique

Le composant `AdminAudit` teste via `fetch` et requêtes Supabase directes :
- **12 routes** : `/`, `/boutique`, `/panier`, `/checkout`, `/a-propos`, `/contact`, `/auth`, `/homme`, `/femme`, `/enfant`, `/accessoires`, `/admin`
- **4 tables DB** : products, categories, pages, orders — comptages + RLS
- **Storage** : bucket `media` accessible
- **Navigation** : tous les liens du header publiés
- **Console warnings** : liste les composants connus avec warnings actifs

Pas de modifications DB, pas de nouveaux hooks — juste 2 nouveaux fichiers + corrections dans 3 fichiers existants.
