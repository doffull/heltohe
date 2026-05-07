## Objectifs

1. **Réparer Aperçu Live** (`FabLivePreview`) : modes "Groupés" inerte et "Enregistrer" qui n'impacte pas la home.
2. **Dock glassmorphism unifié** (inspiré de l'image jointe) regroupant Voix, Chat, Message, Éditeur Visuel (admin), Notifications…
3. **Jeu-concours autonome** : centré par défaut, déplaçable libre + design personnalisable depuis l'admin.

---

## 1. Réparation Aperçu Live (`src/components/admin/FabLivePreview.tsx`)

### Bugs identifiés
- **Mode "Groupés"** : la prévisualisation ne dessine que des icônes draggables individuelles ; aucun rendu du mini-socle. Sélectionner "Groupés" ne change rien visuellement.
- **Save sans effet** : `updateDesignSettings({ unifiedFab: { ...cfg, items } })` écrit `position_desktop`/`position_mobile` sur chaque item, mais `UnifiedFab` consomme ces clés uniquement en mode `free`/`grouped`. En mode `socle` (défaut), seules `cfg.position_desktop`/`cfg.position_mobile` sont lues → l'utilisateur ne voit aucun changement.
- L'iframe `src="/"` est en `pointer-events: none` mais ne reflète pas non plus les changements (recharge non forcée après save).

### Corrections
- **Suppression du dragging dans la preview** : conversion en **panneau de contrôle non interactif** (résumé visuel des positions actives) puisque le drag se fait désormais en direct sur la home (déjà implémenté dans `UnifiedFab` via `useAdminDrag`).
- Aperçu = un petit cadre 16/9 montrant les 4 coins avec les icônes positionnées correctement selon le mode actif (lecture seule).
- Bouton **« Ouvrir la home en mode admin »** qui pointe vers `/` dans un nouvel onglet pour faire le drag réel.
- **Si on garde le drag en preview** (option B) : injecter aussi le résultat dans `cfg.position_desktop`/`cfg.position_mobile` (mode socle) ET dans `cfg.clusterPos_*` (mode cluster) selon le mode courant, puis recharger l'iframe via `key={Date.now()}` après save.

### Choix retenu
**Option A** (lecture seule + lien vers home) — plus fiable, évite la duplication de logique de drag entre 2 fichiers et corrige les 2 bugs d'un coup.

---

## 2. Dock Glassmorphism Unifié

### Design (réf. image jointe)
Pill arrondie (`rounded-full`) avec :
- `backdrop-blur-2xl bg-white/5` + `border border-white/15`
- ombre douce + halo radial derrière (gradient teal/cyan paramétrable via accent color)
- icônes circulaires 44px, gap 8px, padding 12px
- icône "active/sélectionnée" → pastille assombrie `bg-foreground/40` derrière
- placement par défaut : **bottom-center** (`bottom: 24px; left: 50%; translate(-50%)`)

### Contenu du dock (configurable)
Tous les boutons disponibles, chacun **toggle on/off depuis l'admin** :
- 🎤 Voix
- 🤖 Chatbot
- 💬 Message (custom FAB existant)
- ✏️ Éditeur Visuel (visible **admin only**)
- 🔔 Notifications (custom FABs)
- + boutons custom DB (`home_fab_buttons`)

### Implémentation
- **Nouveau mode** `mode: 'dock'` dans `unifiedFab` (en plus de `socle`/`free`/`grouped`/`cluster`).
- Rendu dans `src/components/layout/UnifiedFab.tsx` : nouveau bloc à la place du cluster, style pill glass.
- Position du dock paramétrable : `dockPos_desktop` / `dockPos_mobile` (avec preset "center-bottom" par défaut → support `corner: 'bc'` dans `cornerStyle`, ou nouveau type `{ anchor: 'bottom-center', offset: 24 }`).
- Drag admin du dock entier (réutiliser `useAdminDrag`).
- Inclusion dans le dock : sur chaque item + chaque custom FAB, flag `inDock: true|false` dans la config (déjà présent : `freeCustomIds`, `clusterFree` → généralisation).

### Édition (`UnifiedFabEditor.tsx`)
- Ajouter un 5ᵉ mode "**Dock unifié**" dans la grille de modes.
- Sous-section : checklist des éléments à inclure dans le dock (Voix / Chat / Message / Éditeur visuel / Notifications / customs).
- Direction (row/col), taille des icônes, intensité du blur, couleur du halo.

---

## 3. Jeu-concours pleinement personnalisable

### Position
- **Défaut au centre de la page** : nouveau preset `center` (`top: 50%; left: 50%; translate(-50%, -50%)`).
- Toujours déplaçable librement par admin (drag déjà en place via `useAdminDrag` quand item est `clusterFree`/isolé).
- Le Jeu-concours est **forcé hors du dock** (toujours autonome) pour rester très visible.

### Design (nouvel éditeur dans `AdminRoulette` ou `UnifiedFabEditor`)
Stocker dans `unifiedFab.rouletteFab` :
- `variant`: `glossy | glass | neon | metal | outline | minimal | gift-pulse`
- `accentColor`: hex
- `size`: `sm | md | lg | xl`
- `shape`: `round | pill | rect-bevel`
- `label`: texte (déjà présent via `config.fab_label`)
- `pulse`: bool (animation ping)
- `icon`: choix via `IconPicker`

### Refacto `RouletteFab` (trigger button)
- Remplacer le markup hardcodé du trigger (lignes 226-244) par un bouton paramétrable lisant `unifiedFab.rouletteFab`.
- Conserver `cornerStyle` si `corner` défini, sinon centre par défaut.
- Drag admin (réutiliser `useAdminDrag`) — sauvegarde dans `cfg.rouletteFab.position_desktop/mobile`.
- `RouletteFab` dans `UnifiedFab.tsx` reste rendu depuis `Home.tsx` (déjà le cas) — supprimer le doublon dans `UnifiedFab` (`<RouletteFab hideTrigger />`) ou le garder en `hideTrigger` modal.

### Note importante
Actuellement `<RouletteFab />` est rendu **2 fois** : une fois dans `Home.tsx` (avec trigger) + une fois dans `UnifiedFab.tsx` (`hideTrigger`). Cela duplique potentiellement le bouton. Garder uniquement la version `Home.tsx` comme trigger visuel, et `UnifiedFab` ne fait que contrôler l'ouverture via `setRouletteOpen`.

---

## Fichiers à modifier

| Fichier | Action |
|---|---|
| `src/components/admin/FabLivePreview.tsx` | Refactor en lecture seule + bouton "Ouvrir home admin" |
| `src/lib/fabPosition.ts` | Ajouter support `corner: 'cc'` (centre) + `cornerStyle` étendu |
| `src/components/layout/UnifiedFab.tsx` | Nouveau mode `dock`, retrait du double `<RouletteFab>` |
| `src/components/admin/UnifiedFabEditor.tsx` | 5ᵉ mode "Dock", section design Jeu-concours |
| `src/components/home/RouletteFab.tsx` | Trigger paramétrable (variant, taille, position centrée par défaut, drag admin) |
| `src/types/index.ts` | Étendre `unifiedFab` (`dockPos_*`, `inDock`, `rouletteFab`) |

Aucun changement DB requis.

## Risques
- Position "centre" doit éviter de couvrir le contenu : ajouter une note d'avertissement dans l'éditeur + offset ajustable.
- Le trigger Roulette doit rester accessible clavier (`tabIndex`, `aria-label`).
