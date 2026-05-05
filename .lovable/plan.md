## Refonte Page d'Accueil — Style Techwear

### Points importants à valider d'abord

**1. Marque** — La maquette montre le logo Adidas. Votre projet est **HELVETICA / LVTK6** (Industrial Luxury). Je vais reproduire **la mise en page exacte** (layout, formes, panneaux stats, sélecteurs, hexagones, animations) mais avec **votre logo Helvetica**, pas celui d'Adidas (risque légal + cohérence marque).

**2. Stack** — Vous demandez `index.html` + `home.css` + `home.js` vanilla. Le projet est en **React + Vite + Tailwind**. Ouvrir un `index.html` standalone casserait votre routing, votre auth, votre panier. Je vais donc livrer la **même architecture modulaire** mais sous forme React :
- `src/views/HomeView.tsx` (remplace l'actuel)
- `src/components/home/techwear/*` (composants découpés, équivalents des "sections" HTML)
- `src/styles/home-techwear.css` (variables CSS en tête, classes préfixées `hw-`)
- `src/config/homeConfig.ts` (équivalent du `CONFIG` JS : textes, liens, tailles, couleurs, stats)

Toutes les variables CSS, le `CONFIG`, le préfixe `hw-`, les animations, le responsive, l'accessibilité, le respect de `prefers-reduced-motion` — **tout est conservé à l'identique**.

### Ce qui sera construit

**Nouvelle HomeView (remplace `HeroSlider` + sections actuelles sur `/`) :**

```text
┌──────────────────────────────────────────────────────┐
│ Header existant (intact, non touché)                  │
├──────────────────────────────────────────────────────┤
│  hexagones   ┌────────────┐    ┌── Stats panel ──┐   │
│  contour     │  Card 420  │    │ Price    ▓▓▓▓░  │   │
│  (SVG bg)    │  ×680 px   │    │ Durab.   ▓▓▓▓▓  │   │
│              │  Logo HV   │    │ Fashion  ▓▓▓░░  │   │
│              │            │    └─────────────────┘   │
│              │  Mannequin │    ┌── Color swatches ┐  │
│              │  PNG       │    │ ■ □ ▨            │  │
│              │            │    └──────────────────┘  │
│              │            │    ┌── Size selector ─┐  │
│              │            │    │ Size [XS]        │  │
│              │ ┌MODEL─┐   │    │ Size [XL]        │  │
│              │ │0.1.2 │   │    └──────────────────┘  │
│              └────────────┘                          │
│              [   SHOP NOW   ]                        │
│              [ EXPLORE COLLECTION ]                  │
├──────────────────────────────────────────────────────┤
│ Footer existant (intact)                              │
└──────────────────────────────────────────────────────┘
```

**Composants React créés :**
1. `TechwearHero.tsx` — wrapper hero (`#hw-hero`), gère animations & parallaxe hexagones
2. `HexBackground.tsx` — SVG hexagones contour + ligne horizontale (parallaxe Intersection Observer)
3. `HeroCard.tsx` — card centrale clip-path biseauté, logo + image produit
4. `StatsPanel.tsx` — Price/Durability/Fashion + barres animées 1.2s
5. `ColorSwatches.tsx` — 3 couleurs, swatch actif étendu, switch image produit
6. `SizeSelector.tsx` — tailles depuis config, toggle actif
7. `ModelBadge.tsx` — hexagone "MODEL 0.1.2"
8. `HeroCTAs.tsx` — boutons SHOP NOW / EXPLORE (liens vers `/shop` et `/boutique` existants)

**Fichier de config (`src/config/homeConfig.ts`) :**
```ts
export const HOME_CONFIG = {
  modelBadge: "MODEL 0.1.2",
  ctaPrimary: { label: "SHOP NOW", href: "/shop" },
  ctaSecondary: { label: "EXPLORE COLLECTION", href: "/boutique" },
  sizes: ["XS","S","M","L","XL","XXL"],
  defaultSize: "XS",
  colorOptions: [
    { name: "Black", hex: "#1A1A1A", image: "/assets/home/model-black.png" },
    { name: "White", hex: "#F5F5F5", image: "/assets/home/model-white.png" },
    { name: "Gray",  hex: "#888888", image: "/assets/home/model-gray.png" },
  ],
  defaultColor: 0,
  stats: [
    { label: "Price", value: 85 },
    { label: "Durability", value: 90 },
    { label: "Fashion", value: 70 },
  ],
};
```

**CSS (`src/styles/home-techwear.css`) :**
- Bloc `:root { --color-bg, --color-white, --color-black, --color-gray-light, --color-gray-medium, --color-text, --color-border, --color-panel-bg, --font-main, --font-size-nav, --font-size-cta, --font-size-label, --header-height, --hero-padding, --panel-padding, --blur-panel, --transition-speed, --border-radius, --card-width, --card-height, --card-bevel }`
- Toutes les classes préfixées `hw-` (isolation totale)
- Keyframes `hw-fade-up`, `hw-slide-right`, `hw-fill-bar` avec délais échelonnés (0.1/0.3/0.4/0.5/0.6/0.7s)
- `@media (prefers-reduced-motion: reduce) { *animations: none }`
- Breakpoints 1200px (panels sous card, card 360px) et 768px (CTA full width, footer grid 2×2)
- Importé **uniquement** dans `TechwearHero.tsx` → zéro impact sur le reste du site

### Images mannequin

3 PNG transparents (Black/White/Gray) requis dans `/public/assets/home/`. Je peux les **générer via Lovable AI (Nano Banana)** — silhouette techwear style éditorial, fond transparent. Sinon vous fournissez vos visuels.

### Ce qui reste intact (RÈGLE ABSOLUE respectée)

- Header (`MainLayout`), Footer, Sidebar, Cart, Auth, ChatBot, SubscribeFab, Visual Editor — **non touchés**
- Routes, Supabase, RLS, edge functions — **non touchées**
- Admin (`AdminDesign > HeroSlider`) reste fonctionnel ; option : ajouter un toggle "Mode Techwear" pour switcher entre l'ancien HeroSlider configurable et la nouvelle vue (à confirmer)
- Anciens composants (`HeroSlider.tsx`, `CategoryGrid`, `ProductSections`) **conservés** (juste plus rendus sur `/`)

### Questions de validation

1. **Logo** : on utilise votre logo Helvetica (depuis `design_settings`) au lieu du Trefoil Adidas ? ✅ recommandé
2. **Sections sous le hero** : on garde `CategoryGrid` + `ProductSections` sous le nouveau hero, ou page d'accueil **uniquement le hero plein écran** (comme la maquette) ?
3. **Images mannequin** : génération IA, ou vous fournissez les 3 PNG ?
4. **Toggle admin** : ajouter un switch "Hero Techwear vs Hero Slider classique" dans Admin > Design ?

Validez ces 4 points et j'implémente.