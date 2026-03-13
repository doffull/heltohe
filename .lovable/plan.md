

## Audit complet — bugs identifiés + refonte UI

---

### Bug 1 — Titre/sous-titre du Hero ne persiste pas (critique)

**Cause racine confirmée :** `AppContext.tsx` ligne 86-87 :
```typescript
// Ligne 86 — ternaire mal formé, résultat toujours ignoré
setDesignSettingsLocal(prev => ({ ...INITIAL_DESIGN_SETTINGS, ...dbSettings, ...prev === INITIAL_DESIGN_SETTINGS ? dbSettings : {} }));
// Ligne 87 — ÉCRASE immédiatement avec dbSettings bruts depuis la DB
setDesignSettingsLocal(dbSettings);
```
Le double `setDesignSettingsLocal` fait que lors de chaque rechargement, la DB regagne toujours. La séquence exacte du bug :
1. User tape un nouveau titre → `updateDesignSettings` → debounce 800ms → `saveDesignSettings.mutate` → sauvegardé OK en DB
2. Après sauvegarde, `onSuccess` appelle `queryClient.invalidateQueries` → `dbSettings` se rafraîchit → `useEffect` ligne 84 se redéclenche → `setDesignSettingsLocal(dbSettings)` est appelé **mais** `dbSettings` contient les nouvelles données… **sauf si** la Query Cache `staleTime: 5min` retourne les anciennes données

**Vrai problème :** La Query a `staleTime: 1000 * 60 * 5` (5 minutes). Après `invalidateQueries`, React Query marque la query comme stale et la refetch, mais si l'utilisateur a fait plusieurs modifications pendant ces 5 minutes avec le debounce à 800ms, il est possible que la dernière mutation parte avec un `designSettings` stale (capturé par la closure du `useCallback`). De plus le double `setDesignSettingsLocal` est une race condition.

**Fix :** Simplifier l'effet de sync — ne remplacer les settings locaux depuis la DB **que si** ce sont encore les `INITIAL_DESIGN_SETTINGS` (premier chargement uniquement). Après ça, ne plus jamais overrider le local depuis le remote. Réduire le `staleTime` à 0 ou retirer le cache.

---

### Bug 2 — Bouton croix rouge "Arrière-plan" ne supprime pas l'image

**Cause racine :** `FileDropZone.handleRemove` appelle `onUpload('')` (ligne 71). Le handler `onUpload` du fond dans `HeroSliderTab` (ligne 201-204) :
```typescript
onUpload={(url) => {
  const isVideo = /\.(mp4|webm|mov|ogg)$/i.test(url);
  updateSlide(index, { backgroundMedia: url, media: url || slide.media, ... });
}}
```
Quand `url = ''` (suppression) : `url || slide.media` garde **l'ancien** `slide.media`, donc `media` ne se vide jamais. Et `currentFile={slide.backgroundMedia || slide.media}` — si `backgroundMedia` vaut `''`, le fallback `|| slide.media` continue d'afficher l'image. L'UI ne reflète donc jamais la suppression.

**Fix :** Passer `onUpload` un `url | null` ou gérer explicitement le cas `url === ''` pour vider les deux champs (`backgroundMedia: '', media: ''`). Et dans `currentFile`, utiliser `slide.backgroundMedia || slide.media || ''` proprement.

---

### Plan d'implémentation

**4 fichiers à modifier :**

**1. `src/context/AppContext.tsx`**
- Supprimer le double `setDesignSettingsLocal`. Remplacer par : initialiser depuis DB une seule fois au premier chargement.
- Supprimer `staleTime: 5min` sur le hook `useDesignSettings` ou le réduire à 30s.

**2. `src/pages/admin/AdminDesign.tsx` — `HeroSliderTab`**
- Corriger `onUpload` du fond (backgroundMedia) : quand `url === ''`, mettre `backgroundMedia: '', media: ''`.
- Ajouter un live preview du slider dans le panneau — un mini-aperçu en haut de chaque slide card (preview 16:9 avec le titre/image actuelle).
- Refonte UI : ajouter des couleurs d'accent + séparation visuelle claire entre les sections (couleurs de header de card, badges de statut par slide).

**3. `src/components/admin/HeaderDesignTab.tsx`**
- Refonte UI : ajouter un live preview du header en haut de la section (mini header visuel qui reflète en temps réel le preset sélectionné, la couleur de fond, la couleur du texte et le logo actuel).
- Améliorer la présentation des presets avec des couleurs distinctes.

**4. `src/hooks/useDesignSettings.ts`**
- Réduire `staleTime` de 5 minutes à 0 pour que la DB soit toujours fraîche après save.

---

### Refonte UI demandée

**Hero Slider tab :**
- Header de section coloré (gradient primaire) avec badge de compteur de slides
- Chaque slide card avec un en-tête de couleur (couleur d'accent de la slide)
- Mini preview 16:9 en haut de chaque card affichant l'image de fond + titre superposé

**Header tab :**
- Bloc "Live Preview" fixe en haut : rendu miniature du header avec les vrais couleurs, logo et liens
- Fond coloré différent pour chaque section (Presets / Navigation / Bandeau / Couleurs)

Ces 2 sections sont les seules modifiées (Disposition non touchée comme demandé).

