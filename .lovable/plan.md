## Diagnostic

### Bug racine (cause des 2 problèmes signalés)

Dans `src/context/AppContext.tsx`, `flushDesignSettings` capture `designSettings` via closure (`useCallback` avec `[..., designSettings]` en deps).

Quand un éditeur fait :
```ts
updateDesignSettings({ homePageBlocks: blocks });
await flushDesignSettings();
```
`updateDesignSettings` met à jour le state via `setDesignSettingsLocal(prev => ...)`, mais React n'a pas encore re-rendu → la closure de `flushDesignSettings` détient encore **l'ancien** `designSettings`. Le flush envoie donc l'**ancien** objet à la DB, écrasant les modifs locales pas encore réconciliées. → "j'enregistre, ça ne sauvegarde pas".

Cela impacte directement :
- `HomeBlocksEditor.save()` (ordre des sections home, ex. "section Image remontée")
- `HomeCustomSectionsEditor.persist()` (sections personnalisées)
- Tout futur appel update+flush enchaîné

### Bug additionnel UnifiedFabEditor

`UnifiedFabEditor.save()` n'appelle **jamais** `flushDesignSettings()` — il s'appuie uniquement sur le debounce 800 ms. Si l'admin change d'onglet ou refresh dans la fenêtre, la modification est perdue.

### Demande utilisateur

Un seul bouton "Tout enregistrer" en haut de la page `/admin/home-icons` qui flush en une fois toutes les modifs (blocs, sections personnalisées, popup, bouton flottant unifié, FAB list).

## Plan

### 1. Corriger `flushDesignSettings` (cause racine) — `src/context/AppContext.tsx`

Utiliser une ref qui suit toujours le dernier `designSettings` :
- Ajouter `const latestRef = useRef(designSettings)` mis à jour dans un `useEffect`.
- `flushDesignSettings` lit `latestRef.current` au lieu de la closure.
- Variante plus sûre : exposer une signature `flushDesignSettings(override?: DesignSettings)` qui, si un override est fourni, l'utilise (et synchronise le local state + ref) — utile pour les composants qui veulent garantir l'envoi d'un snapshot précis.

Effet de bord positif : **tous** les `update + flush` existants commencent à fonctionner correctement, sans toucher aux composants appelants.

### 2. Fiabiliser `UnifiedFabEditor.save()` — `src/components/admin/UnifiedFabEditor.tsx`

- Construire l'objet `nextUnifiedFab` puis :
  ```ts
  updateDesignSettings({ unifiedFab: nextUnifiedFab });
  await flushDesignSettings(); // bénéficie de la ref corrigée
  ```
- Ajouter un badge d'état "Modifications non enregistrées / Enregistrement… / Enregistré ✓" (mêmes patterns que `HomeCustomSectionsEditor`).
- Sync : quand `designSettings.unifiedFab` change depuis l'extérieur, hydrater les states locaux (actuellement seul `items` est resynchronisé).

### 3. Auto-save bouton flottant unifié (filet de sécurité)

Ajouter un debounce 800 ms qui appelle `updateDesignSettings({ unifiedFab })` à chaque changement local — sans toast — pour qu'un oubli de clic ne perde plus rien. Le bouton "Enregistrer" force le flush + toast.

### 4. Bouton global "Tout enregistrer" — `src/pages/admin/AdminHomeIcons.tsx`

- Barre sticky en haut de la page avec :
  - Indicateur global ("Tout est à jour ✓" / "Modifications en attente…").
  - Bouton **"Tout enregistrer"** qui :
    1. Émet un événement custom `homeicons:flush` (que `UnifiedFabEditor`, `HomeBlocksEditor`, `HomeCustomSectionsEditor` écoutent pour pousser leur state local dans `updateDesignSettings`).
    2. Appelle `flushDesignSettings()` une seule fois → un seul aller-retour DB.
    3. Toast unique "Tous les changements enregistrés".
- Chaque éditeur ajoute un `useEffect` qui s'abonne à l'événement et `updateDesignSettings(...)` avec son state courant.
- Les boutons "Enregistrer" individuels existants restent, mais deviennent secondaires.

### 5. Vérifications après changements

- Tester : modifier l'ordre dans `HomeBlocksEditor` → cliquer Enregistrer → recharger /index → ordre persiste.
- Tester : changer un paramètre dans `UnifiedFabEditor` → Enregistrer → recharger → conservé.
- Tester : tout modifier puis "Tout enregistrer" → un seul toast, tout persiste.

## Fichiers modifiés

- `src/context/AppContext.tsx` — ref pour `flushDesignSettings` (fix racine).
- `src/components/admin/UnifiedFabEditor.tsx` — flush au save, badge d'état, debounce, écoute événement global.
- `src/components/admin/HomeBlocksEditor.tsx` — écoute événement global, badge d'état.
- `src/components/admin/HomeCustomSectionsEditor.tsx` — écoute événement global (l'auto-save reste).
- `src/pages/admin/AdminHomeIcons.tsx` — barre sticky + bouton "Tout enregistrer".

## Hors scope

- Pas de refonte du `PageBuilder` ni des sections déjà fonctionnelles.
- Pas de modification de schéma DB.
- Pas de changement aux FABs custom (`home_fab_buttons`), qui ont déjà leur propre persistance via React Query.
