## Hero Techwear dynamique + admin lié aux produits

### 1. Nouveau champ `techwear_hero` (DB)

Migration : ajouter une colonne JSONB `techwear_hero` sur `design_settings` (RLS déjà en place — public lecture, admin écriture). Structure :

```ts
type TechwearHeroConfig = {
  enabled: boolean;
  productId: string | null;   // si défini → tailles/couleurs/CTA "Shop now" pris du produit
  modelBadge: { line1: string; line2: string };
  ctaPrimary:   { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  // Stats (3 lignes, sliders 0–100)
  stats: { label: string; value: number }[];
  // Visible sizes (sous-ensemble des tailles produit, ou libre)
  visibleSizes: string[];
  defaultSize: string;
  // Couleurs (héritées du produit OU custom)
  colorOptions: { name: string; hex: string; image: string }[];
  defaultColor: number;
  // Affichage de l'image mannequin dans la card
  imageFit: 'cover' | 'contain' | 'fill' | 'none';
  imagePosition: string;   // top|center|bottom|left|right
  // Toggle des panneaux droits
  showStats: boolean;
  showColors: boolean;
  showSizes: boolean;
  showModelBadge: boolean;
};
```

Ajout dans `useDesignSettings.ts` (mapping in/out) + `DesignSettings` type + `INITIAL_DESIGN_SETTINGS`.

### 2. `TechwearHero.tsx` dynamique

- Lit `designSettings.techwearHero`.
- Si `enabled === false` → retourne `null` (le hero classique reste affiché par-dessus si activé séparément, sinon l'utilisateur voit le contenu en dessous).
- Si `productId` défini : merge auto avec le produit (`useProducts` → trouve le produit, déduit `colorOptions` depuis `product.colorOptions || product.colors`, `visibleSizes ⊆ product.sizes`, `ctaPrimary.href = /boutique/{id}`).
- Sinon utilise les valeurs custom de la config ou le fallback statique actuel.
- Image courante : applique `imageFit` / `imagePosition` via `style.objectFit/objectPosition` (corrige le bug actuel sur la card).
- Accessibilité renforcée :
  - `<section role="region" aria-label="Hero produit">`
  - Boutons couleur : `role="radiogroup"` + `aria-checked`.
  - Boutons tailles : `aria-pressed`.
  - Stats panel : `role="list"` + `aria-label`.
  - Image mannequin : `alt` dynamique avec couleur sélectionnée.
  - Focus visible (outline) sur swatches & sizes.
  - Respect déjà en place de `prefers-reduced-motion`.

### 3. Onglet admin "Hero Techwear"

Nouveau composant `TechwearHeroTab` ajouté dans `AdminDesign.tsx` :
- Ajouté à `NAV_ITEMS` (icône `LayoutDashboard` ou `Sparkles`) entre `hero` et `header`.
- Sections de l'éditeur :
  1. **Activation** — switch `enabled` + bandeau d'aperçu.
  2. **Produit lié** — `<Select>` listant `useProducts().data`. "Aucun (config manuelle)" possible. Si choisi : badge "Couleurs/tailles/CTA hérités du produit" + boutons "Resynchroniser depuis le produit".
  3. **Image & affichage** — `Select` Fit (cover/contain/fill/none) + Position (5 options). Live mini-preview 3:4.
  4. **Couleurs** — liste éditable (drag, ajout, supp). Chaque ligne : nom, picker hex, FileDropZone image PNG transparente + bouton AI (`AiImageButton`). Si produit lié : bouton "Importer depuis le produit".
  5. **Tailles** — liste éditable + sélection des tailles à afficher (chips toggle), + taille par défaut.
  6. **Stats** — 3 sliders avec label éditable et valeur 0–100.
  7. **Badge MODEL** — 2 inputs (line1/line2) + switch visibilité.
  8. **CTA** — 2 paires (label + URL/produit, avec auto-fill `/boutique/{id}` si produit lié).
  9. **Sauvegarde** — utilise le bouton global "Sauvegarder" déjà présent.

### 4. Test visuel

Ajouter `src/components/home/__tests__/TechwearHero.test.tsx` (Vitest + Testing Library) :
- Vérifie que le hero s'affiche désactivé quand `enabled=false`.
- Vérifie que les 3 stats, les 3 couleurs, les tailles visibles et le badge sont rendus quand activé.
- Vérifie que cliquer sur un swatch met à jour `aria-checked` et le `src` de l'image.
- Vérifie l'accessibilité de base (rôles, alt).

(snapshot léger du markup interne `hw-card-image` + `hw-color-row.is-active`)

### 5. Fichiers touchés

**Migration :** `supabase/migrations/<ts>_techwear_hero.sql` — `ALTER TABLE design_settings ADD COLUMN techwear_hero JSONB DEFAULT ...`

**Types & data :**
- `src/types/index.ts` — ajout `TechwearHeroConfig` + champ dans `DesignSettings`.
- `src/data/initialData.ts` — défaut.
- `src/hooks/useDesignSettings.ts` — mapping `db.techwear_hero`.

**UI :**
- `src/components/home/TechwearHero.tsx` — version dynamique.
- `src/config/homeConfig.ts` — devient `DEFAULT_TECHWEAR_HERO` (fallback).
- `src/pages/admin/AdminDesign.tsx` — nouveau `TechwearHeroTab` + entrée nav.

**Test :**
- `src/components/home/__tests__/TechwearHero.test.tsx`.

### 6. Hors scope (pour rester focus)
- Pas de gestion stock temps réel sur la card (juste affichage des tailles disponibles).
- Pas de panier-add depuis le hero (le CTA renvoie à la fiche produit).

J'enchaîne sur l'implémentation.