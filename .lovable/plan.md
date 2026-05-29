# Refonte du jeu-concours (Roulette + Scratch)

## Constat de l'audit

- **`RouletteFab.tsx`** : labels SVG qui chevauchent au centre quand 4+ segments, icône emoji + label collés sur une même `<text>`, taille de roue calculée une seule fois au montage (cassée au resize), pointeur qui dépasse hors du dialog, dialog `max-w-md` trop étroit pour une roue de 340px sur mobile → contenu rogné.
- **`GameScratchFab.tsx`** : pas de retour visuel pendant le scratch, cartes non révélées peuvent chevaucher le bouton fermer en SE.
- **Aucun bruitage** sur le spin ni sur la révélation.
- Code dupliqué (cooldown, persistence) entre les 2 composants.

## Refonte proposée

### 1. Nouveau composant `RouletteWheel.tsx` (SVG propre)
- Roue **responsive** via `ResizeObserver` sur le conteneur (s'adapte 220 → 380 px).
- Labels segmentés : **icône** et **texte** sur 2 `<text>` séparés, orientés radialement, avec `textLength` + `lengthAdjust="spacingAndGlyphs"` pour éviter tout débordement.
- Auto-shrink de la police selon nombre de segments (4 = 14px, 6 = 12px, 8 = 10px).
- Séparateurs blancs entre slices, hub central avec ombre, pointeur **dans** le SVG (plus de débordement).
- Easing personnalisé `cubic-bezier(0.22, 0.61, 0.36, 1)` sur 5.5s.

### 2. Refonte `RouletteFab.tsx`
- Dialog en `max-w-[min(92vw,440px)]`, padding réduit sur mobile (`p-3`), header compact.
- Bouton fermer repositionné hors de la zone de la roue.
- Layout flex vertical strict : titre → roue (centrée, `aspect-square`) → email → bouton → résultat.
- Email + bouton spin **toujours visibles** sous la roue (pas de scroll caché).
- État "résultat" affiché en overlay sur la roue (badge + code), pas en dessous → évite saut de hauteur.

### 3. Refonte `GameScratchFab.tsx`
- Grille 3 cartes en `gap-2 sm:gap-4`, `min-h-0` pour éviter overflow.
- Animation de scratch via canvas (effet de grattage réel au pointer) — fallback CSS si pas de canvas.
- Carte gagnante : pulse + halo coloré.

### 4. Bruitages (nouveau hook `useGameSounds.ts`)
- Sons WebAudio générés en mémoire (pas de fichier externe) :
  - **`tick`** : courte impulsion 800Hz, jouée par segment qui passe sous le pointeur pendant la rotation (calculé via `requestAnimationFrame` + rotation interpolée).
  - **`win`** : arpège ascendant 3 notes sur révélation.
  - **`scratch`** : bruit blanc filtré pendant le grattage.
- Toggle silence via icône 🔊 / 🔇 dans le dialog, persistant en `localStorage` (`lvtk:game_sound`).
- Respect de `prefers-reduced-motion` → désactivé par défaut.

### 5. Hook commun `useGameSession.ts`
Extrait la logique partagée : cooldown, persistence `LS_LAST` / `LS_RESULT`, validation email, appel `useSpinRoulette`. Utilisé par les 2 composants.

## Fichiers

**Créés**
- `src/components/games/RouletteWheel.tsx`
- `src/hooks/useGameSounds.ts`
- `src/hooks/useGameSession.ts`

**Réécrits**
- `src/components/home/RouletteFab.tsx`
- `src/components/games/GameScratchFab.tsx`

**Inchangés** : `GameRouter.tsx`, `useRoulette.ts`, RPC `spin_roulette`, configs admin.

## QA prévue
- Test desktop 1280px + mobile 360/390px avec 3, 4, 6, 8 segments.
- Vérification overflow / chevauchement via DevTools.
- Test mute toggle + persistance.
