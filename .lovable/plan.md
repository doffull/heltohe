
## Diagnostic

The presets sidebar currently exist as simple buttons that call `updateDesignSettings` with a partial set of values. The problem is twofold:

1. **Incomplete preset definitions** — Each preset only sets a few `show*` flags but ignores important settings like `sidebarBg`, `sidebarGradient`, `gradientIntensity`, `sidebarImageOpacity`, `sidebarSliderEnabled`, `sidebarSliderSpeed`, `statBarFilledColor`, `hudButtons`, etc. For example, clicking "Classique" doesn't reset the background color, or the gradient state.

2. **No visual feedback** — There's no way to tell which preset is currently active. All 6 buttons look identical regardless of state.

3. **Missing "Catalogue" preset logic** — The `catalog` preset has no associated `updateDesignSettings` call at all (falls through without doing anything).

4. **Slider settings not exposed** — The admin sidebar tab has no UI for `sidebarSliderEnabled`, `sidebarSliderSpeed`, or `sidebarSliderMaxProducts`, so those features from `SidebarProductHUD.tsx` are inaccessible.

---

## Plan

### 1. Define rich, complete SIDEBAR_PRESETS data

Replace the inline array in `SidebarTab` with a complete constant `SIDEBAR_PRESETS` where each preset carries a **full set of settings** that fully describes the sidebar look:

```typescript
const SIDEBAR_PRESETS = [
  {
    id: 'classic',
    name: 'Classique',
    desc: 'Image + carte + hotspots',
    icon: '🏪',
    settings: {
      showSidebarProductCard: true,
      showSidebarSizes: true,
      showSidebarStats: true,
      showSidebarGallery: true,
      showSidebarProductNumber: true,
      sidebarBg: '#0a0a0a',
      sidebarGradient: false,
      gradientIntensity: 0,
      sidebarImageOpacity: 1,
      sidebarSliderEnabled: true,
      sidebarSliderSpeed: 6000,
      sidebarSliderMaxProducts: 5,
      statBarFilledColor: '#ffffff',
      statBarEmptyColor: '#333333',
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Image seule + CTA',
    icon: '◻',
    settings: {
      showSidebarProductCard: false,
      showSidebarSizes: false,
      showSidebarStats: false,
      showSidebarGallery: false,
      showSidebarProductNumber: false,
      sidebarBg: '#0a0a0a',
      sidebarGradient: false,
      gradientIntensity: 0,
      sidebarImageOpacity: 0.85,
      sidebarSliderEnabled: false,
    }
  },
  {
    id: 'parallax',
    name: 'Parallaxe',
    desc: 'Image fixe + hotspots animés',
    icon: '🎞',
    settings: {
      showSidebarProductCard: true,
      showSidebarSizes: true,
      showSidebarStats: true,
      showSidebarGallery: true,
      showSidebarProductNumber: true,
      sidebarBg: '#0d0d0d',
      sidebarGradient: true,
      gradientIntensity: 60,
      sidebarImageOpacity: 0.9,
      sidebarSliderEnabled: true,
      sidebarSliderSpeed: 8000,
    }
  },
  {
    id: 'vitrine',
    name: 'Vitrine',
    desc: 'Gradient + promo',
    icon: '✨',
    settings: {
      showSidebarProductCard: true,
      showSidebarSizes: false,
      showSidebarStats: false,
      showSidebarGallery: true,
      showSidebarProductNumber: false,
      sidebarBg: '#111111',
      sidebarGradient: true,
      gradientIntensity: 85,
      sidebarImageOpacity: 0.7,
      sidebarSliderEnabled: true,
      sidebarSliderSpeed: 5000,
    }
  },
  {
    id: 'dark',
    name: 'Sombre',
    desc: 'Fond sombre + stats',
    icon: '🌑',
    settings: {
      showSidebarProductCard: false,
      showSidebarSizes: false,
      showSidebarStats: true,
      showSidebarGallery: false,
      showSidebarProductNumber: true,
      sidebarBg: '#050505',
      sidebarGradient: false,
      gradientIntensity: 0,
      sidebarImageOpacity: 0.25,
      statBarFilledColor: '#ffffff',
      statBarEmptyColor: '#1a1a1a',
    }
  },
  {
    id: 'catalog',
    name: 'Catalogue',
    desc: 'Grille de produits en rotation',
    icon: '📖',
    settings: {
      showSidebarProductCard: true,
      showSidebarSizes: true,
      showSidebarStats: false,
      showSidebarGallery: true,
      showSidebarProductNumber: true,
      sidebarBg: '#0a0a0a',
      sidebarGradient: false,
      gradientIntensity: 0,
      sidebarImageOpacity: 0.6,
      sidebarSliderEnabled: true,
      sidebarSliderSpeed: 4000,
      sidebarSliderMaxProducts: 8,
    }
  },
];
```

### 2. Active preset detection + highlighted active button

Add a helper function to detect which preset is currently active by comparing `designSettings` against each preset's `settings`. The matching preset's card gets a highlighted border and checkmark.

```text
┌─────────────────────────────────────────────────────────────────┐
│ Presets Sidebar                                                  │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│ │ ✓ Classique  │  │  Minimal     │  │  Parallaxe   │           │
│ │ (border vert)│  │              │  │              │           │
│ └──────────────┘  └──────────────┘  └──────────────┘           │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│ │  Vitrine     │  │  Sombre      │  │  Catalogue   │           │
│ └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Expose slider controls in the Sidebar tab

Add a new card "Slider de produits" in the sidebar tab (below the presets) with:
- Toggle: Activer le slider automatique
- Boutons de vitesse: 3s / 5s / 8s / 12s  
- Slider: Nombre de produits max (1–10)

### 4. Files modified

| Fichier | Changement |
|---|---|
| `src/pages/admin/AdminDesign.tsx` | Replace inline preset array with `SIDEBAR_PRESETS` constant, add active detection, add slider controls card |
