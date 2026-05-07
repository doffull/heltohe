## Objectif

1. **Hero TechwearHero** : pouvoir positionner librement le badge "MODEL 0.1.2" (par défaut en haut à droite) et déplacer le bloc latéral contenant **Couleurs / Tailles / Price·Durability·Fashion**.
2. **Bouton flottant** : regrouper **Voix + Assistant** dans un mini-socle commun, placé sur un côté de l'écran (gauche par défaut, configurable). **Jeu-concours** et **Message/Chat secondaire** restent indépendants et déplaçables où l'on veut.
3. **Admin `/admin/home-icons`** : ajouter un sélecteur **gauche / droite** pour le mini-socle Voix+Assistant et conserver le drag libre pour les autres icônes.

---

## 1. TechwearHero — éléments repositionnables

Étendre `TechwearHeroConfig` (`src/types/index.ts` + `src/config/homeConfig.ts`) :

```ts
modelBadgePos?: { corner: 'tl'|'tr'|'bl'|'br'; x: number; y: number }; // défaut tr 24/24
sidePanelPos?:  { corner: 'tl'|'tr'|'bl'|'br'; x: number; y: number }; // bloc couleurs/tailles/stats
```

Dans `TechwearHero.tsx` :
- Le badge `MODEL` devient `position: absolute` dans le conteneur du hero, placé via `modelBadgePos` (par défaut top-right).
- Le panneau latéral (couleurs + tailles + StatBar) devient un bloc unique `position: absolute` placé via `sidePanelPos`.
- En mode admin (`useAuth().isAdmin`), les deux blocs sont **draggables** (pointer events, snap 8 px). À la fin du drag → `updateDesignSettings({ techwearHero: { ..., modelBadgePos, sidePanelPos } })` debounce 600 ms.

Dans `TechwearHeroTab.tsx` (admin) : ajouter deux blocs « Position du badge » et « Position du panneau » avec corner + sliders X/Y, identiques au pattern de `UnifiedFabEditor`.

---

## 2. Refonte des FAB

### Modèle de données (`design_settings.unifiedFab`)
Ajouter un nouveau mode `grouped` (en plus de `socle` et `free`) :

```jsonc
{
  "mode": "grouped",
  "groupSide": "left",          // "left" | "right"
  "groupOffsetY": 200,          // distance au top
  "items": [
    { "id":"voice",    "groupedIn":"chat",  ... }, // forcés dans le mini-socle
    { "id":"chat",     "groupedIn":"chat",  ... },
    { "id":"roulette", "groupedIn":"free", "position_desktop":{...}, "position_mobile":{...} },
    { "id":"message",  "groupedIn":"free", ... }   // bouton chat secondaire / message
  ]
}
```

### `UnifiedFab.tsx`
- Nouveau rendu `mode === 'grouped'` :
  - Mini-socle vertical (Voix + Assistant) collé sur le bord choisi (`left`/`right`), centré verticalement avec offset configurable. Toujours visible (pas de toggle Sparkles).
  - Les autres items (Roulette, Message) rendus indépendamment via leur `position_desktop`/`position_mobile` comme déjà fait en mode `free`.
- En admin : drag du mini-socle (déplacement vertical + bascule gauche/droite si traversée du milieu) **et** drag individuel des autres icônes.
- Hint vocal repositionné à côté du mini-socle.

### `UnifiedFabEditor.tsx`
- Sélecteur de mode passe à 3 options : **Socle unifié / Icônes libres / Voix+Assistant groupés**.
- En mode `grouped` : afficher Radio **Côté = Gauche / Droite**, slider **Décalage vertical**, et un sous-éditeur de positions libres pour Roulette et Message.

### `FabLivePreview.tsx`
- Quand mode `grouped` : afficher le mini-socle ancré au bord choisi, draggable verticalement + drag horizontal pour basculer côté ; les icônes Roulette/Message restent draggables librement comme aujourd'hui.

---

## 3. Z-index & non-gêne

- Mini-socle Voix+Assistant : `z-40`, marge automatique vis-à-vis du Sidebar (offset latéral = 76 px si sidebar visible côté gauche).
- Roulette/Message : conservent `z-50` mais s'évitent mutuellement (snap minimal 8 px, pas de collision automatique — laissé à l'admin).

---

## Fichiers touchés

- **Modif** : `src/types/index.ts` (ajout `modelBadgePos`, `sidePanelPos`, `unifiedFab.mode='grouped'`, `groupSide`, `groupOffsetY`, `items[].groupedIn`)
- **Modif** : `src/config/homeConfig.ts` (defaults)
- **Modif** : `src/components/home/TechwearHero.tsx` (badge + panneau absolus + drag admin)
- **Modif** : `src/components/admin/TechwearHeroTab.tsx` (éditeurs de position)
- **Modif** : `src/components/layout/UnifiedFab.tsx` (mode `grouped`)
- **Modif** : `src/components/admin/UnifiedFabEditor.tsx` (mode + côté)
- **Modif** : `src/components/admin/FabLivePreview.tsx` (rendu mode `grouped`)

Aucun changement DB, aucune nouvelle dépendance.

---

## Critères d'acceptation

1. Sur la home, le badge "MODEL 0.1.2" est par défaut en **haut à droite** du hero.
2. En admin, je peux glisser le badge et le panneau couleurs/tailles/stats où je veux dans le hero, et c'est persisté.
3. Le bouton flottant propose un mode **Voix+Assistant groupés** placé à gauche (par défaut) ou à droite, sans gêner les CTA d'achat.
4. Jeu-concours et Message peuvent être déplacés indépendamment partout sur l'écran (desktop + mobile).
5. L'admin `/admin/home-icons` permet de choisir le côté du mini-socle et d'éditer toutes les positions via l'aperçu live.
