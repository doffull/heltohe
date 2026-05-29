# Problème

Dans `/admin/parametres` → onglet **Catégories**, le sélecteur "Colonnes : 2 / 3 / 4" ne semble rien faire :

1. La grille d'aperçu juste en dessous utilise des classes **codées en dur** (`grid sm:grid-cols-2 lg:grid-cols-3`) → le choix n'a aucun effet visuel immédiat dans l'admin.
2. La sauvegarde existe (auto-save debounced 800 ms via `AppContext.updateDesignSettings`), mais sans **aucun retour visuel** : l'utilisateur croit que rien n'est enregistré.
3. Aucun bouton "Enregistrer" explicite, aucun toast de confirmation.

Conclusion : la valeur est bien persistée en base (`design_settings.category_columns`), mais l'UI ne le montre pas → impression que "rien ne marche".

# Plan

**Fichier : `src/pages/admin/AdminSettings.tsx`** (onglet Catégories uniquement)

1. **Rendre la grille d'aperçu dynamique**
   Remplacer `className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4"` par une grille pilotée par `designSettings.categoryColumns` (2, 3 ou 4 colonnes en desktop, dégradé responsive mobile/tablette).

2. **Étendre le sélecteur à 2 / 3 / 4 / 5 / 6 colonnes**
   Pour offrir la même amplitude que `LayoutEditorTab` (slider 2–5) et au-delà.

3. **Ajouter un indicateur de sauvegarde explicite**
   - Petit badge à côté du sélecteur : `Enregistré ✓` (vert) / `Enregistrement…` (spinner) basé sur l'état de `saveDesignSettings` exposé via `useApp`.
   - Toast `Disposition enregistrée` quand la mutation réussit après un changement de `categoryColumns`.

4. **Ajouter un bouton "Enregistrer maintenant"** (optionnel mais demandé : "save")
   Bouton compact à côté du sélecteur qui appelle `flushDesignSettings()` immédiatement (court-circuite le debounce 800 ms) et déclenche le toast.

# Hors périmètre

- Pas de changement DB (la colonne `category_columns` existe déjà et est sauvegardée correctement).
- Pas de changement à `useDesignSettings` ni à `AppContext` (logique de save déjà OK).
- Pas de modification de la grille catégories de la home (`src/pages/Home.tsx` honore déjà `categoryColumns`).

# Résultat attendu

L'utilisateur clique sur `2`, `3`, `4`, `5` ou `6` → la grille d'aperçu admin change immédiatement, un toast `Disposition enregistrée` s'affiche, et au rechargement la valeur est conservée.
