
## Two fixes in one

### 1. Bug: Switch galerie (et autres) ne change pas visuellement

**Root cause** : `checked={(designSettings as any)[key] !== false}` 

Quand la valeur est `undefined` (jamais sauvegardée) → `undefined !== false = true` → toujours affiché ON.  
Quand on clique pour désactiver, le `updateDesignSettings({ showSidebarGallery: false })` est bien appelé **mais** si Supabase ne persiste pas les nouvelles clés `show*` dans la table, elles retournent `undefined` au prochain chargement → le switch rebascule sur ON.

**Fix**: Remplacer par `checked={Boolean((designSettings as any)[key] ?? true)}` + vérifier que `updateDesignSettings` déclenche bien `useSaveDesignSettings` (le debounce dans AppContext).

En fait le vrai problème est que ces clés (`showSidebarProductCard`, `showSidebarGallery`, etc.) n'existent **pas** dans la DB `design_settings` — elles ne sont pas dans `settingsToDb()` dans `useDesignSettings.ts`. Donc quand on sauvegarde, ces valeurs ne sont pas persistées → au rechargement, `undefined !== false = true` à chaque fois.

**Solution** : Ajouter ces colonnes dans `settingsToDb()` (et leur lecture dans `dbToSettings()`) dans `useDesignSettings.ts`. Alternativement, les stocker dans un JSONB existant comme `hud_buttons` ou créer un champ `sidebar_config` JSONB.

La solution la plus simple sans migration DB : **stocker tous les flags `show*` dans un objet JSONB `sidebar_config`** dans la table `design_settings` (colonne existante, ou utiliser `pages` JSONB qu'on n'utilise pas pour ça).

Meilleure solution : ajouter les colonnes manquantes dans `settingsToDb`/`dbToSettings` qui mapperont vers des colonnes dans la DB. On a besoin d'une migration.

**Migration SQL** :
```sql
ALTER TABLE design_settings
  ADD COLUMN IF NOT EXISTS show_sidebar_product_card boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_sidebar_sizes boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_sidebar_stats boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_sidebar_gallery boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_sidebar_product_number boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sidebar_slider_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sidebar_slider_speed integer DEFAULT 6000,
  ADD COLUMN IF NOT EXISTS sidebar_slider_max_products integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS sidebar_brand_name text,
  ADD COLUMN IF NOT EXISTS sidebar_brand_subtitle text,
  ADD COLUMN IF NOT EXISTS sidebar_info_text text,
  ADD COLUMN IF NOT EXISTS sidebar_product_title text,
  ADD COLUMN IF NOT EXISTS sidebar_product_description text,
  ADD COLUMN IF NOT EXISTS sidebar_sizes jsonb,
  ADD COLUMN IF NOT EXISTS sidebar_image_opacity numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mobile_sidebar_image text,
  ADD COLUMN IF NOT EXISTS mobile_sidebar_media_type text;
```

Puis mapper dans `settingsToDb` et `dbToSettings` dans `useDesignSettings.ts`.

---

### 2. Aperçus SVG pour les presets

Remplacer le simple emoji + texte par une **carte avec miniature SVG** représentant le rendu de chaque preset.

Chaque SVG ~100×160px représente une sidebar stylisée :

```
┌──────────────────────────────────────────┐
│  [SVG Classique]    [SVG Minimal]         │
│  ┌─────┐            ┌─────┐              │
│  │img  │            │img  │              │
│  │card │            │     │              │
│  │stat ││           │     │              │
│  │stat ││           └─────┘              │
│  └─────┘                                 │
│  Classique ✓         Minimal             │
│  Image + carte       Image seule         │
└──────────────────────────────────────────┘
```

**SVG par preset** :
- **Classique** : fond sombre, image haute, carte produit avec lignes de texte, 3 barres de stat
- **Minimal** : fond sombre, image pleine hauteur, rien d'autre
- **Parallaxe** : fond avec gradient visible, image + carte + stat
- **Vitrine** : gradient fort (violet/bleu), galerie petite en bas
- **Sombre** : fond quasi-noir, image très sombre, seulement les stat bars
- **Catalogue** : 2 petites images côte à côte (rotation rapide)

---

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| Migration SQL | Ajouter ~17 colonnes `show_sidebar_*`, `sidebar_slider_*`, `sidebar_brand_*`, `sidebar_image_opacity`, etc. |
| `src/hooks/useDesignSettings.ts` | Mapper les nouvelles colonnes dans `dbToSettings` et `settingsToDb` |
| `src/pages/admin/AdminDesign.tsx` | Remplacer les cartes preset emoji → cartes avec miniatures SVG inline |
