# Plan global — Hero Techwear v2 + Logo global

## 1. Robustesse Hero Techwear (anti écran blanc)

### 1.1 Logging explicite
**`src/components/home/TechwearHero.tsx`** : wrapper `try/catch` autour du merge cfg + `console.error('[TechwearHero] cfg invalide', { champ, valeurReçue, cfg })` pour identifier le champ fautif.

### 1.2 Error Boundary + Fallback UI
**Nouveau** `src/components/home/HeroErrorBoundary.tsx` (class component) — capture toute erreur du sous-arbre, affiche un fallback minimal (titre + CTA "SHOP NOW" → /boutique) et logge l'erreur. Wrap `<TechwearHero>` et `<HeroSlider>` dans `Home.tsx`.

### 1.3 Tests unitaires defensive
**`src/components/home/__tests__/TechwearHero.test.tsx`** : ajouter cas
- cfg avec `colorOptions: null`, `stats: null`, `visibleSizes: null`, `modelBadge: null`, `ctaPrimary: null` → ne plante pas, rend les valeurs par défaut
- cfg `{ enabled: true }` vide → rend OK
- Error Boundary : composant qui throw → fallback affiché

### 1.4 Validation DB (trigger)
**Migration SQL** : trigger `BEFORE UPDATE` sur `design_settings` qui, pour `techwear_hero`, remplace les sous-champs `null` par les defaults JSONB (via `COALESCE` sur chaque clé : `colorOptions`, `stats`, `visibleSizes`, `modelBadge`, `ctaPrimary`, `ctaSecondary`).

---

## 2. Hero Techwear : Vidéos, Background, Modèle entier

### 2.1 Types (`src/types/index.ts`)
```ts
TechwearColorOption: + mediaType?: 'image'|'video', mediaTablet?, mediaMobile?,
                     videoLoop?, videoMuted?, videoAutoplay?
TechwearHeroConfig: + background: { type: 'gradient'|'color'|'image'|'video',
                                    color?, gradientFrom?, gradientTo?,
                                    mediaUrl?, mediaType?, overlayOpacity? },
                    + cardSize: 'sm'|'md'|'lg'|'xl',
                    + imageOverflow: boolean (modèle dépasse la card)
```

### 2.2 Rendu (`TechwearHero.tsx` + `home-techwear.css`)
- Helper `pickMedia(color, viewport)` → URL + type selon device
- Si `mediaType === 'video'` → balise `<video autoplay muted loop playsinline>`
- Couche absolue `.hw-bg` rendue selon `background.type` (gradient CSS / couleur / `<img>` / `<video>`) + overlay sombre selon `overlayOpacity`
- Card : `data-overflow="true"` → `overflow: visible` + image mannequin `max-height: 115%`, `transform: translateY(-7%)`
- `data-size="sm|md|lg|xl"` → variantes hauteur

### 2.3 Admin (`TechwearHeroTab.tsx`)
- Nouvel onglet **Background** : sélecteur type, color pickers (gradient from/to), `FileDropZone` image OU vidéo (max 30 Mo), slider opacité overlay
- Nouvel onglet **Carte** : sélecteur taille (sm/md/lg/xl), toggle "Mannequin déborde de la carte"
- Par couleur : 3 zones upload (desktop / tablet / mobile) acceptant image OU vidéo + toggle "Boucle"

### 2.4 Upload vidéo (`useFileUpload.ts`)
- Paramètre `accept?: 'image'|'video'|'all'`
- `maxSizeMB={30}` pour vidéos, validation MIME

---

## 3. Hero Techwear par Catégorie

### 3.1 Migration SQL — nouvelle table
```sql
CREATE TABLE category_hero_settings (
  id uuid PK, category_id uuid REFERENCES categories(id) ON DELETE CASCADE UNIQUE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT false,
  created_at, updated_at
);
ALTER TABLE ... ENABLE RLS;
-- Policy: anon SELECT (enabled=true) ; admin ALL
```

### 3.2 Hooks
- `src/hooks/useCategoryHero.ts` : `useCategoryHero(categoryId)` (read public) + `useUpdateCategoryHero` (mutation admin)

### 3.3 Affichage (`CategoryPageRouter.tsx`)
- Si `category_hero_settings.enabled` pour la catégorie → render `<TechwearHero overrideConfig={config} />` AVANT `<CategoryHeader>` (ou en remplacement)
- Prop `overrideConfig?: TechwearHeroConfig` ajoutée à `TechwearHero`

### 3.4 Admin
- Nouvelle section dans `AdminCategories.tsx` (ou nouvel onglet AdminDesign) : sélecteur de catégorie + même UI que TechwearHeroTab (composant réutilisé)

---

## 4. Logo global : taille, forme background, favicon, footer

### 4.1 Migration SQL — nouvelles colonnes `design_settings`
```sql
ALTER TABLE design_settings ADD COLUMN
  logo_size integer DEFAULT 40,                  -- 24-120 px
  logo_background_shape text DEFAULT 'none',     -- none|circle|square|triangle|hexagon|blob
  logo_background_color text DEFAULT '',
  logo_background_padding integer DEFAULT 8;
```

### 4.2 Types & hook
- `DesignSettings` : ajouter `logoSize?`, `logoBackgroundShape?`, `logoBackgroundColor?`, `logoBackgroundPadding?`
- `useDesignSettings.ts` : mapper snake_case ↔ camelCase + corriger mapping `footer_logo` → `footerLogo` et `favicon_url` → `faviconUrl` (cause probable du bug "favicon ne marche pas")

### 4.3 Composant partagé
**Nouveau** `src/components/layout/BrandLogo.tsx`
```tsx
<BrandLogo variant="header"|"footer"|"sidebar"|"favicon" size? />
```
- Applique `width: logoSize`, `padding: logoBackgroundPadding`, `background-color: logoBackgroundColor`
- `clip-path` selon shape (triangle: `polygon(50% 0,100% 100%,0 100%)`, hexagon, blob via SVG mask)
- Utilisé par `Header.tsx`, `Footer.tsx`, `Sidebar.tsx`, `HUDOverlays.tsx`

### 4.4 Favicon dynamique
**`src/App.tsx`** : `useEffect` qui lit `faviconUrl` et met à jour `<link rel="icon">` dans le `<head>` (création si absent)

### 4.5 Admin (`HeaderDesignTab.tsx`)
Nouvelle Card "Logo global" :
- Slider taille (24-120 px)
- Sélecteur forme (none/circle/square/triangle/hexagon/blob) avec previews
- Color picker background + slider padding
- Upload favicon (`FileDropZone`) + upload footer logo

---

## 5. QA — tests visuels obligatoires
1. Activer Hero Techwear, sauver — pas d'erreur, plus d'écran blanc
2. Uploader une vidéo 28 Mo en background — joue en boucle, muted
3. `imageOverflow=true` + `cardSize=xl` — mannequin entier visible, dépasse en haut
4. Activer Hero catégorie "Hommes" — visible sur `/boutique/hommes`
5. Logo size 80px + shape triangle + color #FF0 — appliqué partout
6. Upload favicon — onglet navigateur mis à jour
7. Cfg DB volontairement corrompue (`colorOptions: null`) — Hero rend les defaults, console log explicite, pas de crash

---

## Fichiers touchés

**Créer**
- `src/components/home/HeroErrorBoundary.tsx`
- `src/components/layout/BrandLogo.tsx`
- `src/hooks/useCategoryHero.ts`
- `supabase/migrations/<ts>_category_hero_and_logo.sql`
- `supabase/migrations/<ts>_techwear_hero_validation_trigger.sql`

**Modifier**
- `src/types/index.ts`
- `src/components/home/TechwearHero.tsx`
- `src/components/home/__tests__/TechwearHero.test.tsx`
- `src/styles/home-techwear.css`
- `src/components/admin/TechwearHeroTab.tsx`
- `src/components/admin/HeaderDesignTab.tsx`
- `src/hooks/useFileUpload.ts`
- `src/hooks/useDesignSettings.ts`
- `src/pages/Home.tsx` (Error Boundary wrapper)
- `src/pages/CategoryPageRouter.tsx`
- `src/pages/admin/AdminCategories.tsx` (ou AdminDesign — onglet "Hero catégories")
- `src/components/layout/Header.tsx`, `Footer.tsx`, `Sidebar.tsx`, `HUDOverlays.tsx` (utiliser BrandLogo)
- `src/App.tsx` (favicon dynamique)
