## Objectif

Permettre, dans `/admin/home-icons`, de **déplacer chaque icône flottante** (Voix, Assistant, Jeu-concours) **individuellement** sur un aperçu visuel en temps réel de la page d'accueil, et de sauvegarder leur position exacte (desktop + mobile).

Aujourd'hui, seul le socle unifié peut être déplacé en bloc. L'utilisateur veut éclater le socle pour positionner chaque sous-bouton à l'endroit de son choix sur la home.

## Ce qui change

### 1. Modèle de données (`design_settings.unifiedFab`)

Étendre chaque item avec une position propre + un mode :

```json
{
  "mode": "free",                  // "socle" (actuel) | "free" (nouveau)
  "items": [
    {
      "id": "voice", "label": "Voix", "icon": "Mic", "visible": true, "order": 0,
      "position_desktop": { "corner": "br", "x": 24, "y": 96 },
      "position_mobile":  { "corner": "br", "x": 16, "y": 80 }
    },
    { "id": "chat",     ... },
    { "id": "roulette", ... }
  ]
}
```

Pas de migration SQL : `unifiedFab` est déjà un champ JSON libre.

### 2. Rendu (`UnifiedFab.tsx`)

- Si `mode === "free"` → rendre chaque item comme un FAB indépendant, à sa propre position (plus de socle Sparkles + menu déployant).
- Si `mode === "socle"` → comportement actuel conservé.
- Le hint vocal et les actions (ouverture VoiceCommandFab, ChatBotWidget, RouletteFab) restent identiques.

### 3. Nouvel éditeur visuel (`AdminHomeIcons.tsx` → onglet « Aperçu live »)

Composant `FabLivePreview.tsx` :

```text
┌─────────────────────────────────────────┐
│  [Toggle Desktop / Mobile]              │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │   Aperçu home (iframe ou         │  │
│  │   capture statique en fond)      │  │
│  │                                   │  │
│  │             🎤  ← draggable       │  │
│  │                                   │  │
│  │                       🤖          │  │
│  │                       🎁          │  │
│  └───────────────────────────────────┘  │
│  Position Voix : right 24px, bottom 96  │
│  [Réinitialiser] [Enregistrer]          │
└─────────────────────────────────────────┘
```

- Fond = `<iframe src="/" />` sans interactions (pointer-events: none) pour voir la home réelle.
- Overlay absolu avec les 3 icônes draggables (`pointer-events:auto`).
- Drag basé sur `pointerdown/move/up` (pas de lib), conversion px → `{corner, x, y}` selon le quadrant le plus proche du clic final.
- Switch Desktop (1280×800) / Mobile (390×844) qui redimensionne l'iframe et édite le bon champ (`position_desktop` / `position_mobile`).
- Snap optionnel (grille de 8px) + affichage en direct des coordonnées sous chaque icône.
- Bouton « Enregistrer » → `updateDesignSettings({ unifiedFab: { mode:'free', items:[...] } })`.

### 4. Mise à jour du `UnifiedFabEditor.tsx`

- Ajouter un radio « Mode d'affichage » : **Socle unifié** / **Icônes libres**.
- Quand « Icônes libres » est choisi, masquer la position globale et afficher un lien « Ouvrir l'éditeur visuel ».

### 5. Drag direct sur la vraie home (bonus admin)

Dans `UnifiedFab.tsx`, en mode `free` + admin, chaque icône devient draggable directement sur le site (comme l'actuel socle). La nouvelle position est persistée dans `design_settings` via debounce 800 ms.

## Fichiers touchés

- **Création** : `src/components/admin/FabLivePreview.tsx`
- **Modif** : `src/components/layout/UnifiedFab.tsx` (mode free + drag par item)
- **Modif** : `src/components/admin/UnifiedFabEditor.tsx` (sélecteur de mode)
- **Modif** : `src/pages/admin/AdminHomeIcons.tsx` (nouvel onglet « Aperçu live »)
- **Modif** : `src/types/index.ts` (typage `unifiedFab.items[].position_*` + `mode`)

Aucun changement de schéma DB, aucune nouvelle dépendance.

## Critères d'acceptation

1. Dans `/admin/home-icons`, onglet **Aperçu live**, je vois la home en fond avec les 3 icônes superposées.
2. Je peux glisser chaque icône où je veux (desktop **et** mobile via toggle).
3. Au clic « Enregistrer », les positions sont stockées et la home publique reflète immédiatement le nouvel emplacement.
4. En mode admin sur la home réelle, je peux aussi attraper chaque icône pour l'ajuster, sans passer par l'admin.
5. Le mode « socle unifié » reste disponible et fonctionnel pour ceux qui le préfèrent.