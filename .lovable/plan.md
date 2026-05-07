# Gestion libre des boutons flottants + CTAs Hero mobile

## 1. Drag & drop admin sur TOUS les boutons flottants (live, in-place)

Aujourd'hui, seul le bouton "Sparkles" du socle est draggable côté admin, et l'aperçu live est dans une iframe séparée. On unifie : en mode admin, **chaque** bouton flottant visible sur la home est directement déplaçable avec preview temps réel, et la position est sauvegardée.

Boutons concernés :
- **Voix**, **Assistant (chatbot)**, **Jeu-concours** (items du socle / mode libre / mode groupé)
- **Mini-socle groupé** Voix+Assistant (déplacement du bloc entier)
- **Boutons FAB personnalisés** issus de `home_fab_buttons` (Notifications, Bots, Message, etc.)

Comportement :
- Hors admin : aucun changement, les boutons restent à leur position configurée.
- En admin : chaque bouton reçoit une poignée invisible (pointer-down sur le bouton lui-même + Alt-drag pour différencier du clic, ou un overlay `⠿` au survol). Drag → mise à jour optimiste de la position locale → snapping coin le plus proche (tl/tr/bl/br) → toast "Position enregistrée" au relâchement.
- Persistance :
  - Items du socle (`voice`, `chat`, `roulette`) → `design_settings.unifiedFab.items[].position_desktop / position_mobile` (déjà supportés côté admin, on ajoute juste l'écriture depuis la home).
  - Mini-socle groupé → `design_settings.unifiedFab.groupSide` + `groupOffsetY` mis à jour.
  - FABs custom DB → `home_fab_buttons.position_desktop / position_mobile` via `useHomeFabMutations.upsert`.
- Le viewport courant détermine quelle clé est éditée (`position_mobile` si <768px, sinon `position_desktop`).
- Indicateur visuel admin : ring primary + petit label `corner x·y` au survol.

Le bloc `FabLivePreview` (iframe + drag overlay) devient redondant pour Voix/Assistant/Jeu-concours puisque c'est éditable directement sur la vraie home — on le garde uniquement comme **résumé non-interactif** (lecture seule, sliders pour valeurs précises) sous `AdminHomeIcons`.

## 2. CTAs Hero adaptés mobile

Sur le viewport actuel (360px), les CTAs `Découvrir` / `Voir collection` du `TechwearHero` débordent et restent en taille `lg/xl`. On rend le rendu responsif **sans** changer la config admin.

Changements ciblés dans `src/styles/home-techwear.css` :
- Sous `@media (max-width: 640px)` :
  - `.hw-cta-positioned { flex-direction: column; gap: 8px; width: calc(100% - 32px); left: 16px; right: 16px; }`
  - `.hw-cta-btn { width: 100%; min-height: 44px; padding: 10px 16px; font-size: 12px; letter-spacing: 0.12em; }`
  - Force toutes les tailles (`hw-cta-sz-sm/md/lg/xl`) à converger vers 44px de haut, font 12px, padding 10/16 sur mobile (override).
  - `.hw-cta-positioned.is-row` repassé en `flex-direction: column` (priorité mobile).
- Mêmes overrides pour la branche fallback `.hw-cta-primary / .hw-cta-secondary`.

Aucun changement TS / config — uniquement CSS responsive.

## Détails techniques

### Fichiers à modifier
- `src/components/layout/UnifiedFab.tsx`
  - Ajouter `useAuth().isAdmin` drag handler générique `makeDraggable(itemId, kind: 'socleItem' | 'group' | 'customFab')` avec mise à jour optimiste + debounce 600ms d'écriture (`updateDesignSettings` ou `useHomeFabMutations.upsert`).
  - Wrapper chaque bouton (custom, free, grouped, mini-socle) avec `onPointerDown` admin et style `cursor-grab` + ring.
  - Snapping coin : `pxToPos` (logique déjà présente dans `FabLivePreview.tsx`) extraite vers `src/lib/fabPosition.ts`.
- `src/lib/fabPosition.ts` (nouveau)
  - Exports `pxToPos`, `posToPx`, `cornerStyle`.
- `src/components/admin/FabLivePreview.tsx`
  - Importer depuis `fabPosition.ts` (suppression duplication). Garder l'aperçu mais marquer-le "Aperçu — édition désormais directement sur la home".
- `src/styles/home-techwear.css`
  - Ajouter media queries mobile décrites ci-dessus.

### Hors scope
- Pas de modification de schéma DB (les colonnes `position_desktop/mobile` existent déjà sur `home_fab_buttons` et dans `design_settings.unifiedFab.items`).
- Pas de changement du comportement public / non-admin.
- Pas de modification du Hero TechwearHeroTab admin (déjà couvert par étape précédente).

### Points d'attention
- Différencier clic vs drag : seuil de 5px de mouvement avant de considérer drag → sinon trigger l'action habituelle du bouton.
- Sur mobile admin (touch), `touchAction: 'none'` sur les boutons en drag pour éviter scroll parasite.
- Persistance debounced pour éviter de spammer l'API pendant un drag long.
