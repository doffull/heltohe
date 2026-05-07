# Audit & corrections drag admin

## Diagnostic du bug "il saute en haut à gauche"

Dans `src/lib/fabPosition.ts`, la fonction `pxToPos(left, top, w, h, btn = 56)` utilise le 5ᵉ argument `btn` à la fois comme **largeur** ET comme **hauteur** de l'élément :

```
y: bottom ? h - top - btn : top   // ← devrait être hauteur réelle, pas largeur
```

`useAdminDrag` ne lui passe que la largeur (`w`) du bouton. Pour la pill « Jeu-concours » (~220×48), la hauteur calculée est fausse → la position commit est hors-champ → au re-render, `cornerStyle` la place collée à un coin (souvent `tl`/`tr`) avec un offset négatif clampé à 0.

Même cause pour le centre vertical (`vertCenter`) qui utilise `cy = top + btn/2` au lieu de `top + h/2`.

## Corrections

### 1. `src/lib/fabPosition.ts` — accepter largeur ET hauteur
- Nouvelle signature : `pxToPos(left, top, vw, vh, elW = 56, elH = elW)`
- Utiliser `elW` partout pour X et `elH` partout pour Y.
- `posToPx` mis à jour de la même façon (utilisé par les previews).
- `cornerStyle` inchangé (déjà correct).

### 2. `src/lib/useAdminDrag.ts` — passer la hauteur réelle
- Mesurer `h` au pointerdown (déjà fait) et le passer : `pxToPos(left, top, vw, vh, w, h)`.
- Bonus : exposer `reset()` qui efface la position en commit (`onCommit(null as any)` ne convient pas) → ajouter une 2ᵉ option `onReset` optionnelle au hook (utilisée plus tard).

### 3. `src/components/home/RouletteFab.tsx` — bouton Reset + ne plus jamais sortir
- Ajouter, en mode admin, un mini bouton « ⟳ » accolé à la pill qui remet `position_desktop` / `position_mobile` à `{ corner: 'cc', x: 0, y: 0 }` (centre absolu).
- Un raccourci clavier `Echap` pendant un drag annule l'opération (relâche les listeners sans commit).

### 4. `src/components/admin/UnifiedFabEditor.tsx` — bouton Reset global
- Dans le bloc « 🎁 Bouton Jeu-concours » : ajouter un bouton « Réinitialiser la position » qui set `position_desktop = { corner: rfCorner, x: 0, y: 0 }` et `position_mobile = idem`.
- Dans le bloc Mode Dock : déjà couvert par `dockPos` mais ajouter aussi un Reset position dock + reset position cluster + reset socle, regroupés dans une rangée « Réinitialiser les positions ».

### 5. Toujours présent dans le Dock — fallback Jeu-concours
Suite au choix utilisateur (« les deux : icône dans le dock ET bouton flottant »), inclure toujours une icône Jeu-concours dans le Dock unifié, en plus du FAB libre :
- Dans `UnifiedFab.tsx` `<Dock />` : ajouter une icône « Gift » qui appelle `setRouletteOpen(true)` quand `rouletteConfig?.enabled` (réglable par un nouveau switch `dockShowRoulette` dans l'éditeur, défaut **true**).
- L'icône reste dans le dock même si le FAB libre est masqué.

### 6. `src/components/home/TechwearHero.tsx` — panneau couleur/taille hors champ
La fonction `pxToCornerPos` est correcte (passe `elW`/`elH`), mais le commit ne **clamp** pas si la valeur initiale du config place le panneau hors du conteneur (cas où on change de slide ou le conteneur rétrécit).
- Dans `freeStyle`, clamp `p.x` et `p.y` à `[0, container - element]` au moment du calcul. Comme `freeStyle` ne connaît pas la taille du conteneur, exposer plutôt un clamp via `useEffect` au mount du composant : si `panelPos.x` ou `.y` rendent l'élément invisible (offsetParent rect en dehors du conteneur), forcer un reset à `{ corner: 'br', x: 24, y: 24 }`.
- Ajouter, en mode admin, deux petits boutons « ⟳ » au-dessus du panneau et du badge model pour forcer un reset (`setPanelPos(undefined)` + `persistPos` avec valeur défaut). Sans admin, les boutons sont cachés.

## Fichiers modifiés
- `src/lib/fabPosition.ts`
- `src/lib/useAdminDrag.ts`
- `src/components/home/RouletteFab.tsx`
- `src/components/admin/UnifiedFabEditor.tsx`
- `src/components/layout/UnifiedFab.tsx` (icône Gift dans le Dock + switch `dockShowRoulette`)
- `src/components/home/TechwearHero.tsx` (clamp + bouton reset admin)

## Hors scope
- Pas de changement DB / RLS / edge functions.
- Pas de refonte du système de drag : on corrige le bug racine et on ajoute des sécurités (reset, clamp).
