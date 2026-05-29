# Corrections — Admin · Icônes flottantes (page d'accueil)

Quatre problèmes ciblés à corriger sur `/admin/home-icons`. Aucun changement DB.

---

## 1. Stylo « Grille catégories » qui ne fait rien d'utile

**État actuel** : dans `HomeBlocksEditor`, le stylo du bloc `categories` redirige vers `/admin/categories`. C'est une page de gestion des catégories, pas un éditeur pour le bloc « grille » de la home (mise en page, colonnes, style).

**Correction** : ouvrir un éditeur dédié au bloc plutôt que de quitter la page.

- Ajouter sous chaque bloc « builtin » du `HomeBlocksEditor` un panneau pliable (Collapsible) qui s'ouvre au clic sur le stylo.
- Pour `categories`, ce panneau contient les nouveaux réglages visuels (voir point 2). Stockés dans `designSettings.homeBlockSettings.categories`.
- Pour les autres blocs (`hero`, `featured`, `flash`…), garder le comportement actuel (navigation vers la page dédiée) puisqu'ils ont déjà un éditeur réel.

---

## 2. Options visuelles pour la grille des catégories

Ajouter dans le panneau du bloc `categories` :

- **Forme du bloc** : `square` (par défaut, actuel), `rounded`, `circle`, `triangle`, `chamfer` (HUD existant), `pill`.
- **Orientation** : `vertical` (image au-dessus du titre, grille classique) ou `horizontal` (image à gauche, titre à droite, format bandeau).
- **Colonnes** : 2 / 3 / 4 (réutilise la valeur existante).
- **Effet survol** : zoom, brightness, none.

Persistance : `designSettings.homeBlockSettings.categories = { shape, orientation, columns, hoverEffect }`.

`CategoryGrid.tsx` lit ces valeurs et applique des classes Tailwind conditionnelles (avec design tokens, pas de couleurs en dur). La carte « Les Boutiques » garde son look actuel.

---

## 3. Image qui « saute » sur les sections personnalisées

**Cause** : dans `HomeCustomSectionsEditor`, l'effet de synchronisation suivant se déclenche à chaque mise à jour de `designSettings` :

```ts
useEffect(() => {
  const cur = (designSettings as any).homeCustomSections;
  if (Array.isArray(cur) && JSON.stringify(cur) !== JSON.stringify(sections)) {
    setSections(cur); // ← écrase l'image fraîchement ajoutée
  }
}, [(designSettings as any).homeCustomSections]);
```

Quand l'utilisateur ajoute/change une image, le state local évolue ; tant que l'auto-save (débouncé 800 ms) n'a pas terminé son aller-retour, `cur` reste l'ancienne valeur DB ≠ local → l'effet replace `sections` par l'ancienne valeur **et l'image disparaît**.

**Correction** :

- Ajouter un ref `dirtyRef` mis à `true` dès que l'utilisateur modifie `sections`, remis à `false` après que la persistance est confirmée.
- L'effet de sync n'écrase le state local **que si `dirtyRef.current === false`** (donc uniquement quand la modif vient d'ailleurs : autre onglet, reload).
- Aligner le même garde-fou dans `HomeBlocksEditor` (même pattern de sync, même risque pour les sections personnalisées réordonnées).
- Le bouton « Tout enregistrer » global continue à fonctionner via l'event `homeicons:collect`.

Résultat : l'image téléversée reste affichée pendant et après la sauvegarde.

---

## 4. Bouton flottant unifié — changements sans effet sur la home

**Symptômes constatés** : modifier mode, taille, blur, position dans `UnifiedFabEditor` ne change rien sur `/`.

**Causes identifiées** :

1. L'auto-save de `UnifiedFabEditor` appelle seulement `updateDesignSettings(...)` (state local du context, **non persisté**), donc un reload de la home perd la modif.
2. Le « Tout enregistrer » dispatch `homeicons:collect` puis attend 50 ms avant `flushDesignSettings()`. Le handler de `UnifiedFabEditor` est bien enregistré, mais comme le `useEffect` qui l'attache n'a **pas de tableau de dépendances**, il est ré-enregistré à chaque render → plusieurs handlers concurrents, et le `buildPayload()` capturé peut être périmé.
3. `RouletteFab`, `UnifiedFab`, `FabStack` lisent bien `designSettings.unifiedFab` mais comme rien n'est persisté en DB, après refetch (`invalidateQueries`) la version sauvegardée écrase la version locale.

**Corrections** :

- Dans `UnifiedFabEditor` : l'auto-save (débouncé) doit appeler `flushDesignSettings({ unifiedFab: payload })` au lieu de seulement `updateDesignSettings`. Indicateur de statut (`dirty`/`saving`/`saved`) conservé.
- Corriger le `useEffect` du handler `homeicons:collect` : passer un tableau de dépendances correct ou utiliser un ref qui pointe vers `buildPayload` à jour, pour garantir un seul handler avec la dernière closure.
- Augmenter le délai du `setTimeout` dans `AdminHomeIcons.handleSaveAll` de 50 ms à 150 ms (laisser React appliquer les `setState` issus de l'event).
- Vérifier (lecture seule) que `UnifiedFab.tsx` rebuild quand `designSettings.unifiedFab` change — déjà le cas via `useApp()`.

---

## Fichiers modifiés

```
src/components/admin/HomeBlocksEditor.tsx       (panneau inline pour bloc categories + fix dirty guard)
src/components/admin/HomeCustomSectionsEditor.tsx (fix dirty guard)
src/components/admin/UnifiedFabEditor.tsx       (auto-save vrai + handler stable)
src/pages/admin/AdminHomeIcons.tsx              (délai collect 150 ms)
src/components/home/CategoryGrid.tsx            (lit shape/orientation/hoverEffect)
src/types/index.ts                              (type homeBlockSettings)
src/data/initialData.ts                         (défauts homeBlockSettings)
```

## Hors périmètre

- Pas de migration DB : `homeBlockSettings` sera stocké dans la colonne JSONB déjà existante (réutilisation d'un champ JSON libre de `designSettings`).
- Pas de refonte du `PageBuilder` ni du `UnifiedFab` côté front utilisateur.
- Audit complet du système d'auto-save dans d'autres écrans : non traité ici (peut être un suivi séparé si besoin).
