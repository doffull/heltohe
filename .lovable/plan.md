## Objectif

Rendre la sauvegarde des réglages admin réellement fiable et visible partout :
- Un **bouton "Enregistrer maintenant"** présent sur toutes les pages admin utilisant `designSettings`.
- Un **autosave perpétuel** avec **backup local (localStorage)** pour ne jamais perdre un changement.
- Un **indicateur de statut clair** (Modifié / Enregistrement… / ✓ Enregistré à HH:MM:SS / Erreur) avec **gestion d'erreur + retry**.
- Un **historique des derniers enregistrements** consultable.

## Diagnostic (vérifié)

Dans `AdminProductBadges.tsx` :
- `commit()` appelle `updateDesignSettings(...)` en mode **debounced (800 ms)** via `AppContext`. L'UI passe en `saving` puis `saved`, mais si l'utilisateur enchaîne des clics rapides, le timer redémarre et le statut retombe sur "Autosave actif" sans confirmation visible d'un vrai flush réseau.
- Aucun **bouton "Enregistrer"** manuel, aucun **backup localStorage**, aucun **timestamp** du dernier save, aucune **UI d'erreur**.
- `AppContext.flushDesignSettings()` existe déjà et flush immédiatement le debounce → c'est la brique idéale pour un bouton manuel.

## Plan

### 1. Composant réutilisable `AdminSaveBar`
Nouveau fichier `src/components/admin/AdminSaveBar.tsx` : barre sticky en haut/bas de page affichant :
- Statut : `Idle` / `Modifié` (ambré) / `Enregistrement…` (spinner) / `✓ Enregistré à 14:32:07` / `⚠ Erreur — Réessayer`.
- Bouton **"Enregistrer maintenant"** (appelle `flushDesignSettings()`).
- Bouton **"Historique"** ouvrant une popover listant les 10 derniers enregistrements (timestamp + taille + statut) lus depuis localStorage.
- Bouton **"Restaurer le dernier backup local"** si un backup non-synchronisé est détecté au chargement.

### 2. Hook `useDesignAutosave`
Nouveau `src/hooks/useDesignAutosave.ts` qui centralise :
- Écoute des changements de `designSettings` (via `AppContext`).
- Écriture d'un **backup dans `localStorage`** sous la clé `design_settings_backup` à chaque modification (throttlé 300 ms).
- Écriture d'un **journal** `design_settings_save_log` (10 dernières entrées : `{ts, ok, error?, bytes}`).
- Exposition de `{ status, lastSavedAt, lastError, saveNow, history, hasLocalBackup, restoreBackup }`.
- Détection d'un backup local plus récent que le cloud au montage → propose la restauration.
- **Retry automatique** avec backoff (3 tentatives : 2s / 5s / 15s) en cas d'erreur réseau, puis statut "Erreur" persistant tant que non résolu.

### 3. Intégration `AdminProductBadges`
- Ajouter `<AdminSaveBar />` en haut de la page.
- Remplacer l'indicateur maison actuel par le statut du hook.
- Garder le `draft` local et `dirtyRef` pour la protection anti-écrasement pendant l'édition.

### 4. Déploiement sur les autres pages admin
Ajouter `<AdminSaveBar />` en tête des pages admin qui éditent `designSettings` : `AdminDesign`, `AdminSettings`, `AdminHomeIcons`, `AdminChatbot`, `AdminCheckout`, `AdminNotifications`, `AdminTransitions`, `AdminMarketing`, `AdminRoulette`, `AdminSecurity`, `AdminPages`, `AdminPageTemplates`. Comme le hook lit depuis `AppContext`, le bouton fonctionne pour toutes ces pages sans logique supplémentaire.

### 5. Amélioration de `AppContext.flushDesignSettings`
- Retourner explicitement le timestamp de succès.
- Émettre un événement `window.dispatchEvent(new CustomEvent('design-settings:saved', { detail: { ts, ok } }))` que `useDesignAutosave` écoute pour mettre à jour l'historique de manière fiable (même quand le flush est déclenché par le debounce interne).
- Sur erreur : ne pas silence — propager pour que la SaveBar affiche l'erreur et permette "Réessayer".

### 6. Résilience
- Si `saveDesignSettings.mutateAsync` throw (offline, 5xx) : garder le backup localStorage, marquer statut "erreur", programmer un retry, ET afficher un toast d'erreur non-bloquant.
- Au retour en ligne (`window.addEventListener('online')`) : déclencher `saveNow()` automatiquement.

## Détails techniques

Clés localStorage :
- `design_settings_backup` : `{ ts, payload }` snapshot complet.
- `design_settings_save_log` : `Array<{ ts, ok, error?, bytes }>` (max 10).

Fichiers modifiés / créés :
- **Nouveau** `src/components/admin/AdminSaveBar.tsx`
- **Nouveau** `src/hooks/useDesignAutosave.ts`
- **Modifié** `src/context/AppContext.tsx` (event `design-settings:saved`, propagation d'erreur, listener `online`)
- **Modifié** `src/pages/admin/AdminProductBadges.tsx` (SaveBar + statut branché sur le hook)
- **Modifié** les pages admin listées à l'étape 4 (ajout d'un `<AdminSaveBar />` en tête).

Pas de changement DB, pas de nouvelle table.
