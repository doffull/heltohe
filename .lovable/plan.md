## 1. Bouton « rouvrir le panneau » (sidebar gauche)

Aujourd'hui c'est un gros carré noir 48×48 en bas à gauche (`MainLayout.tsx` l.638-669, `z-60`) qui chevauche les FAB (voix, assistant, roulette).

Options proposées — je choisis l'approche **discret + intelligent** :

- Remplacer le carré plein par une **petite poignée fine** ancrée sur le bord gauche de l'écran (≈ 8 px de large, 56 px de haut), centrée verticalement, avec une fine flèche `›`.
- État au repos : **semi-transparente** (opacité ~35 %, fond `bg-foreground/20`, backdrop-blur). Au survol / tap : opacité 100 %.
- Apparaît uniquement quand le **header MiniNavbar est visible** (réutiliser le state de scroll qui contrôle déjà l'apparition du header) → quand le header se masque au scroll, la poignée disparaît aussi. Résultat : zéro collision avec les FAB en bas à droite.
- Sur mobile : même poignée latérale, taille un peu plus haute (72 px) pour rester tactile, toujours sur le bord gauche (loin du FAB en bas à droite).
- Garder le bouton X de fermeture **dans** le panneau inchangé.

## 2. Jeu-concours / Roulette / Cartes — n'apparaît plus

Le rendu côté site est piloté par `UnifiedFab.tsx` qui filtre les items via :
```ts
.filter((it) => it.id !== 'roulette' || rouletteConfig?.enabled)
```
et selon le `mode` (`socle | free | grouped | cluster | dock`) + `items[].visible` + `customFabs.visible_*` stockés dans `design_settings.unifiedFab` et la table `home_fab_buttons`.

Plan d'investigation + correctif :

1. Lire l'état actuel en base : `design_settings.unifiedFab` (mode, items, dockShow*, freeCustomIds) et `roulette_config.enabled` + `home_fab_buttons`. Identifier laquelle des conditions masque tout (probable : `mode=dock` avec tous les `dockShow*` à false, ou `items[].visible=false` après une sauvegarde admin, ou `rouletteConfig.enabled=false`).
2. Ajouter un **garde-fou** dans `UnifiedFab` : si après filtres `visibleItems.length === 0 && visibleCustom.length === 0`, retomber sur les `DEFAULT_ITEMS` au lieu d'un écran vide — pour qu'une mauvaise config admin ne fasse jamais disparaître les FAB.
3. Vérifier la sauvegarde dans `AdminRoulette.tsx`, `UnifiedFabEditor.tsx`, `AdminHomeIcons.tsx` : confirmer qu'ils écrivent bien dans `design_settings` / `roulette_config` / `home_fab_buttons`, et que le cache React Query est invalidé (sinon le site public garde l'ancienne config).
4. Tester chaque jeu (Roulette, Scratch, etc.) : ouvrir le panneau depuis le site public et reproduire les bugs « rien ne fonctionne ». Corriger au cas par cas (handlers `triggerItem`, `RouletteFab`, `GameScratchFab`, `GameRouter`).
5. Re-vérifier le site public après chaque correctif (preview navigateur).

## Fichiers touchés (prévisionnel)

- `src/components/layout/MainLayout.tsx` — nouveau composant de poignée latérale, retrait des 2 anciens boutons carrés.
- `src/components/layout/UnifiedFab.tsx` — fallback DEFAULT_ITEMS si tout est masqué + petits fix d'invalidation.
- `src/pages/admin/AdminRoulette.tsx` / `UnifiedFabEditor.tsx` / `AdminHomeIcons.tsx` — invalidation React Query si manquante.
- Possibles correctifs ciblés dans `RouletteFab.tsx`, `GameRouter.tsx`, `GameScratchFab.tsx` selon ce que révèle le test.

## Hors-scope

Pas de refonte du système FAB, pas de migration DB sauf si un bug bloquant l'exige.
