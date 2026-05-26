# Corrections admin Page d'accueil

## Diagnostic

J'ai trouvé **un bug racine** qui explique pourquoi rien ne s'enregistre vraiment côté site.

Dans `src/context/AppContext.tsx`, `flushDesignSettings()` sauve la variable `designSettings` capturée par closure :

```ts
const flushDesignSettings = useCallback(async () => {
  await saveDesignSettings.mutateAsync(designSettings); // ← état STALE
}, [saveDesignSettings, designSettings]);
```

Or dans `HomeCustomSectionsEditor` (et `HomeBlocksEditor`) on fait :
```ts
updateDesignSettings({ homeCustomSections: sections });
await flushDesignSettings(); // appelé avec l'ancien état React
```

Comme `setState` est asynchrone, le flush envoie en BDD **les anciennes données**, sans la nouvelle section image. Le toast dit "enregistré" mais la home ne change pas. C'est exactement le symptôme décrit.

## Corrections

### 1. Fix sauvegarde (AppContext)
- Maintenir un `designSettingsRef` synchronisé via `useEffect`.
- `flushDesignSettings()` lit la valeur depuis le ref → toujours à jour.
- Annule le debounce avant de pousser pour éviter les écritures concurrentes.

### 2. Sections personnalisées visibles sur la home
- Vérifier que les `custom:*` blocs absents de `homePageBlocks` sont bien ajoutés à la volée (déjà le cas dans `Home.tsx` lignes 192-200, mais ne fonctionnait pas à cause du bug 1).
- Après fix, ajouter dans `HomeCustomSectionsEditor` une **invalidation explicite** du cache React Query `['design_settings']` après save, pour forcer un re-render immédiat sur les autres onglets.

### 3. Drag-and-drop mobile-friendly (HomeBlocksEditor)
- Agrandir la zone de poignée tactile (`p-2`, `min-h-12`, `touch-none`).
- Activer `KeyboardSensor` + `TouchSensor` en complément de PointerSensor (déjà partiellement présent).
- Layout vertical empilé sur mobile, suppression du débordement horizontal.

### 4. UX mobile de `/admin/home-icons`
- Conteneur racine : `space-y-4 p-3` (au lieu de `p-4 md:p-6`).
- Grille édition : passer de `lg:grid-cols-3` à un layout 1 colonne sur < `lg`, sans scroll latéral.
- Boutons d'action (Monter/Descendre/Dupliquer/Supprimer) : empilement vertical sur mobile + zone tactile 36×36 minimum.
- Sticky header "Ajouter un bouton" pour rester accessible.

### 5. Cohérence visuelle
- Le `HomeCustomSectionsEditor` réutilise déjà `PageBuilder` qui gère le drag (boutons ↑/↓). On garde, mais on augmente les zones tactiles.

## Vérification post-fix

1. `npm` build (auto par harness).
2. Smoke test :
   - Ajouter section Image → Enregistrer → ouvrir `/` → la section apparaît à la fin.
   - Réordonner via drag dans `HomeBlocksEditor` → Enregistrer → ouvrir `/` → l'ordre correspond.
   - Tester sur viewport 360px : scroll vertical uniquement, drag possible au doigt.

## Fichiers touchés

- `src/context/AppContext.tsx` (fix flush via ref)
- `src/components/admin/HomeBlocksEditor.tsx` (DnD tactile + layout mobile)
- `src/components/admin/HomeCustomSectionsEditor.tsx` (invalidation cache après save)
- `src/pages/admin/AdminHomeIcons.tsx` (responsive mobile)
- `src/components/admin/PageBuilder.tsx` (zones tactiles élargies)

Aucun changement BDD, aucun changement de logique métier — uniquement bug fix + UX mobile.
