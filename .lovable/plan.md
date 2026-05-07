# Plan – Fixer les drags + Bouton Message dans le header

## 1. Bug "Jeu-concours qui se bloque en haut à gauche"

Cause identifiée dans `src/components/home/RouletteFab.tsx` :

- Son `onPointerDown` est une **copie locale** du helper de drag, et il :
  - Calcule la nouvelle position avec `btn = 56` codé en dur, alors que le bouton roulette est un **pill plus large** (~140 px). `pxToPos(...)` calcule donc un mauvais centre (`cx = left + 28`), ce qui mappe le drop en `tl` même quand l'utilisateur lâche au centre/droite → le bouton "saute" en haut-gauche.
  - Fait `target.style.cssText = ''` après commit, ce qui efface aussi la classe de transform pendant le frame avant le re-render React.
  - Ne clamp pas dans le viewport (peut sortir de l'écran).

### Correctif
- **Supprimer** le `onPointerDown` local de `RouletteFab.tsx`.
- Exporter `useAdminDrag` depuis `UnifiedFab.tsx` (le déplacer dans `src/lib/useAdminDrag.ts`) et l'utiliser dans `RouletteFab` :
  - Mesurer dynamiquement `offsetWidth` du bouton et le passer à `pxToPos`.
  - Clamp `left/top` dans `[0, viewport - size]`.
  - Nettoyer uniquement les propriétés inline posées (`left/top/right/bottom/transform/position`) au lieu d'un `cssText = ''`.
- Conserver le persist via `updateDesignSettings({ unifiedFab: { ...cfg, rouletteFab: { ...rfab, [posKey]: pos } } })`.

## 2. Audit & harmonisation des drags admin

Bugs constatés sur la page d'accueil quand on déplace les outils :
- `useAdminDrag` (Dock / Cluster / Group / Custom / SocleFree) calcule correctement `pxToPos`, mais utilise toujours `size = 56`. Pour le **Dock** (pill horizontal large) et le **Cluster** (bloc), ça fausse aussi le snap → impression de "blocage".
- Les boutons libres (free / cluster-free) n'ont pas de **clamp viewport** → on peut les pousser sous le header / sidebar.

### Correctif
- Étendre `useAdminDrag` pour accepter `getSize()` qui lit `offsetWidth/Height` au pointerdown, et l'utiliser pour : clamp + `pxToPos`.
- Pour les blocs (Dock, Cluster, Group), passer la **largeur réelle du conteneur** afin que le snap centre/coin soit correct.
- Ajouter une **garde de safe area** : ne pas déposer sous la sidebar gauche (≥ 64 px / 256 px en lg) ni sous le header (≥ 56 px) — ces marges sont déjà connues de `Header.tsx`.
- Ajouter un toast unique "Position enregistrée" plutôt qu'un toast par type pour cohérence.

## 3. Bouton "Message client" dans le header (comme Notification)

Aujourd'hui :
- La cloche Notif (admin) est un FAB flottant `fixed bottom-20 right-6` dans `MainLayout.tsx` (l. 546-589).
- Le bouton Message est seulement dans le `ChatBotWidget` (côté client) et n'existe pas pour l'admin dans le header.

### Refactor
- **Créer** `src/components/layout/HeaderAdminTools.tsx` qui regroupe :
  - 🔔 **Notifications** (déplacer le `Sheet` actuel de `MainLayout` vers ce composant).
  - ✉️ **Messages clients** (nouveau bouton header, ouvre un `Sheet` listant les conversations chat). Source : table déjà utilisée par `ChatBotWidget` / `contact-chat` edge function — exposer via un hook `useCustomerChats` existant ou minimal (lecture des messages reçus).
  - Style identique : icône dans un cercle `bg-foreground text-background`, badge rouge avec compteur non-lus.
- **Monter** `HeaderAdminTools` dans `Header.tsx` (zone droite, avant le sélecteur de langue) — affiché uniquement si `isAdmin`.
- **Supprimer** le FAB cloche flottant de `MainLayout.tsx`.

## 4. Détails techniques

Fichiers touchés :
- `src/lib/useAdminDrag.ts` *(nouveau, extrait de UnifiedFab)*
- `src/components/layout/UnifiedFab.tsx` *(import du hook, fix size dynamique sur Dock/Cluster/Group)*
- `src/components/home/RouletteFab.tsx` *(remplace drag local par hook commun, fix size dynamique)*
- `src/components/layout/HeaderAdminTools.tsx` *(nouveau)*
- `src/components/layout/Header.tsx` *(monter HeaderAdminTools si admin)*
- `src/components/layout/MainLayout.tsx` *(retirer la cloche flottante + Sheet, déplacer logique vers HeaderAdminTools)*
- `src/hooks/useCustomerChats.ts` *(nouveau, lecture des conversations chatbot)*

Aucun changement de schéma DB ni de backend.

## 5. Validation

- Vérifier en dev (`/`) que :
  - Le bouton Jeu-concours suit la souris exactement et reste à l'endroit où on le lâche (centre, coins, bords).
  - Dock / Cluster / Group se déplacent sans saut.
  - Les boutons ne se cachent jamais sous la sidebar/header.
  - Header admin affiche les 2 icônes (Bell + Mail) avec compteurs.
  - Plus aucun FAB cloche en bas-droite.
