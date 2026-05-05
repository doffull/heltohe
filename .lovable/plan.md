## Objectif

Aujourd'hui `techwearHero` est **une seule configuration**. Vous voulez pouvoir créer **plusieurs slides Hero Techwear**, et pour **chaque slide** retrouver l'intégralité des fonctionnalités (produit lié, image, arrière-plan, carte produit, couleurs, tailles affichées, statistiques, badge modèle, CTA, etc.) — comme un vrai slider défilant en boucle sur la home.

## Architecture proposée

### 1. Modèle de données (compatible existant)

Étendre `TechwearHeroConfig` pour qu'il devienne un **conteneur de slides** :

```ts
interface TechwearHeroConfig {
  enabled: boolean;
  // Réglages slider globaux
  autoplay?: boolean;
  intervalMs?: number;        // défaut 6000
  transition?: 'fade'|'slide';
  showArrows?: boolean;
  showDots?: boolean;
  // Liste des slides — chacune = ancienne config complète
  slides: TechwearHeroSlide[];
}

interface TechwearHeroSlide {
  id: string;                 // uuid
  name?: string;              // libellé admin "Slide 1"
  productId: string | null;
  modelBadge: { line1; line2 };
  ctaPrimary: { label; href };
  ctaSecondary: { label; href };
  stats: { label; value }[];
  visibleSizes: string[];
  defaultSize: string;
  colorOptions: TechwearColorOption[]; // (avec mediaType image|video, loop)
  defaultColor: number;
  imageFit: 'cover'|'contain';
  imagePosition: string;
  showStats; showColors; showSizes; showModelBadge: boolean;
  background: TechwearBackground;       // gradient/color/image/video + overlay
  cardSize: 'sm'|'md'|'lg'|'xl';
  imageOverflow: boolean;
}
```

**Migration douce** : si la BDD contient l'ancien format (sans `slides`), on l'enveloppe automatiquement en `{ enabled, slides: [<ancienConfig>] }` au chargement (dans `useDesignSettings`), zéro perte de données.

### 2. Migration SQL

- Mettre à jour le `DEFAULT` de `design_settings.techwear_hero` pour inclure un tableau `slides`.
- Adapter le trigger `sanitize_techwear_hero` pour :
  - convertir l'ancien format en nouveau si `slides` absent ;
  - garantir `slides` = array, et pour chaque slide, sanitiser `colorOptions`/`stats`/`visibleSizes`/`modelBadge`/`ctaPrimary`/`ctaSecondary` (mêmes règles qu'aujourd'hui mais par slide).

### 3. Front — `TechwearHero.tsx`

Refonte en **slider** :
- Si `slides.length === 0` → ne rien afficher.
- Si `slides.length === 1` → rendre la slide unique (comportement actuel).
- Si `slides.length > 1` → carrousel avec autoplay, fade/slide, flèches, dots, pause au hover.
- Chaque slide est rendue par un sous-composant `TechwearHeroSlide` qui reprend tout le rendu actuel (background, carte, mannequin, stats, sélecteurs couleurs/tailles, badge, CTA).
- Gardé sous `HeroErrorBoundary` (déjà en place).

### 4. Admin — `TechwearHeroTab.tsx`

Refonte UI en deux niveaux :

**Niveau slider (en haut)** :
- Switch "Hero activé"
- Réglages globaux : autoplay, vitesse (slider), transition, flèches, dots
- Liste des slides avec drag-to-reorder, bouton "+ Ajouter une slide", bouton dupliquer, supprimer, voir/masquer

**Niveau slide (édition)** : on sélectionne une slide et on retrouve **exactement les onglets actuels** appliqués à CETTE slide :
- Onglet Produit (productId + sync)
- Onglet Image / Mannequin (médias par couleur, image/vidéo + loop)
- Onglet Arrière-plan (gradient/color/image/video + overlay)
- Onglet Carte (cardSize, imageOverflow)
- Onglet Couleurs (liste éditable)
- Onglet Tailles (visibleSizes, defaultSize)
- Onglet Stats (3 barres)
- Onglet Badge & CTA (modelBadge, ctaPrimary, ctaSecondary)
- Onglet Affichage (toggles showStats/Colors/Sizes/ModelBadge, imageFit, imagePosition)

Aperçu live de la slide en cours d'édition (mini `<TechwearHero overrideSlideIds={[id]} />`).

### 5. Hooks / contexte

- `useDesignSettings.ts` : ajouter la normalisation ancien→nouveau format au mapping snake_case ↔ camelCase.
- `homeConfig.ts` : `DEFAULT_TECHWEAR_HERO` retourne `{ enabled:false, slides:[<DEFAULT_SLIDE>] }`.

### 6. Tests

Étendre `TechwearHero.test.tsx` :
- cfg sans `slides` (ancien format) → ne crashe pas, slide unique rendue
- `slides: []` → rien rendu
- `slides: [a, b]` → autoplay change l'index
- Champs null dans une slide → defaults appliqués

## Fichiers impactés

- `src/types/index.ts` (types)
- `src/config/homeConfig.ts` (defaults)
- `src/hooks/useDesignSettings.ts` (mapping + migration douce)
- `src/components/home/TechwearHero.tsx` (slider + extraction `TechwearHeroSlide`)
- `src/components/admin/TechwearHeroTab.tsx` (UI slides + édition par slide)
- `src/components/home/__tests__/TechwearHero.test.tsx`
- nouvelle migration SQL : default + trigger `sanitize_techwear_hero`

## Hors scope (à confirmer)

- Pas de table dédiée `techwear_hero_slides` : on garde tout dans la colonne JSONB `techwear_hero` (plus simple, atomique, suffisant pour <50 slides).
- Pas de touche au Hero "classique" `HeroSlider` (slides image/vidéo) qui reste indépendant.
