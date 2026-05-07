# Drag fluide + Presets Jeu-concours et Hero

## 1. Refonte du système de drag admin (`src/lib/useAdminDrag.ts`)

- **Pointer Capture** (`setPointerCapture`) au lieu de `window.addEventListener` → moins de lag, meilleure capture mobile.
- **Transform GPU** : pendant le drag on utilise `transform: translate3d()` au lieu de `left/top` (compose-only, pas de reflow).
- **Toggle Snap (admin bar)** : nouvelle option `snap: boolean` lue depuis `localStorage('admin_drag_snap')`.
  - ON = grille 8px + magnétisme bords/centre/coins (10px) + lignes guides bleues live.
  - OFF = drag libre pixel-perfect.
- **HUD live** : petit badge flottant `{x:123, y:45, corner:br}` collé au curseur.
- **Touch / pen** : `touch-action: none` + `pointer-events` propre, fix iOS.

## 2. Barre admin globale (nouveau `AdminDragBar.tsx`)

Mini barre fixe en bas-centre visible uniquement pour `isAdmin`:
- Toggle **Snap ON/OFF**
- Toggle **Lock** (désactive temporairement tout le drag)
- Toggle **Device** (mobile / tablette / desktop) → écrit dans un `AdminViewportContext` partagé. Tous les composants draggables sauvegardent dans la clé du viewport actif (`position_mobile` / `position_tablet` / `position_desktop` + `size_mobile` / `size_tablet` / `size_desktop`).
- Bouton **Copier vers** (mobile→tablet, etc.)
- Bouton **Reset all positions**

## 3. Tailles séparées par device

- Étendre `unifiedFab.rouletteFab` : ajout `size_mobile | size_tablet | size_desktop` (`sm`/`md`/`lg`/`xl`).
- Idem pour `techwearHero.modelBadgePos` / `sidePanelPos` → triplets `_mobile|_tablet|_desktop`.
- Composants lisent via le viewport effectif (admin = override de la barre, public = `window.innerWidth`).

## 4. Presets Jeu-concours (4)

Nouveau fichier `src/config/roulettePresets.ts`. Chaque preset = `{ style, gameType, promoType, label, icon, animation, accentColor, variant, shape, segmentsTemplate }`.

| Preset | Style | Type de jeu | Promo par défaut |
|---|---|---|---|
| **Neon Wheel** | neon + pulse glow | roulette | -10/-20/-30% |
| **Glass Scratch** | glass blur + shimmer | scratch card | montant fixe 5/10/20€ |
| **Mono Mystery** | minimal mono + bevel | mystery box | livraison gratuite + cadeau |
| **Industrial Flash** | metal + 45° clip | flash promo countdown | -% global limité |

UI : dans `AdminRoulette.tsx` → section "Appliquer un preset" avec 4 cartes preview (icône + label + couleur). Click = patch `roulette_config` + `roulette_segments` + `unifiedFab.rouletteFab` (style FAB).

## 5. Presets Hero H2 (TechwearHero — couleurs/tailles/prix-durabilité-fashion)

Nouveau `src/config/techwearHeroPresets.ts`. Chaque preset = `{ layout, skin, titleAnimation, iconSet, statsStyle }`.

| Preset | Layout | Skin | Anim titre | Stats |
|---|---|---|---|---|
| **Compact** | panel collé bas droite | mono blanc/noir | fade-up | barres horizontales fines |
| **Étendu** | panel large gauche | gradient bleu-violet | typewriter | gros chiffres + barres épaisses |
| **Vertical Luxe** | colonne gauche pleine hauteur | noir/or, bevel 45° | glitch | radial dials |
| **Minimal** | overlay coin discret | transparent + outline | neon flicker | texte seul |

UI : dans `TechwearHeroTab.tsx` → section "Presets" avec 4 cartes. Click = patch `designSettings.techwearHero` (layout flags, skin tokens, `titleAnimation`, `iconSet`, `statsStyle`).

## 6. Animation du titre produit + sélecteur d'icônes rapide

Dans `TechwearHero.tsx` (et `ProductInfo.tsx` pour la page produit) :
- Nouveau composant `<AnimatedTitle text icon animation />` avec animations : `fade-up`, `typewriter`, `glitch`, `neon`, `slide-in`, `none`.
- **Drag du titre** activé pour admin (utilise `useAdminDrag`) → `titlePos` par device.
- **Mini popover IconPicker** (réutilise `src/components/admin/IconPicker.tsx`) accessible via bouton `+` à côté du titre quand admin → injecte une icône Lucide avant/après le texte.
- Sélecteur d'animation = dropdown 5 options dans la barre admin contextuelle.

## 7. Validation post-drag (déjà en place, on conserve)

La toolbar `✓ Valider / ✕ Annuler` existante reste, mais s'affiche maintenant **par device** (badge "MOBILE / TABLET / DESKTOP" pour clarifier sur quoi on enregistre).

## Section technique

Fichiers créés :
- `src/config/roulettePresets.ts`
- `src/config/techwearHeroPresets.ts`
- `src/components/admin/AdminDragBar.tsx`
- `src/context/AdminViewportContext.tsx`
- `src/components/home/AnimatedTitle.tsx`

Fichiers modifiés :
- `src/lib/useAdminDrag.ts` (pointer capture, transform3d, snap toggle, HUD)
- `src/lib/fabPosition.ts` (helpers size par device)
- `src/components/home/RouletteFab.tsx` (taille par device, AnimatedTitle pour label)
- `src/components/home/TechwearHero.tsx` (preset apply, drag titre, panneau dimensions par device)
- `src/components/admin/UnifiedFabEditor.tsx` (slider tailles par device + bouton presets)
- `src/components/admin/TechwearHeroTab.tsx` (4 cartes presets + anim titre + icon picker)
- `src/pages/admin/AdminRoulette.tsx` (4 cartes presets jeu-concours)
- `src/App.tsx` (montage `<AdminViewportProvider>` + `<AdminDragBar />`)
- `src/types/index.ts` (nouveaux champs `size_mobile|tablet|desktop`, `titleAnimation`, `titleIcon`, `titlePos`)
- `src/components/product/ProductInfo.tsx` (AnimatedTitle réutilisable)

Pas de migration DB : tout vit dans `design_settings.techwearHero` et `design_settings.unifiedFab` (jsonb).
