# Corrections : bas de page, sécurité, rôles, doublons de fermeture, IA en production

## 1. Retirer la barre IA en bas de l'accueil

La section pleine largeur en bas de l'accueil (bandeau sombre brillant « Commandez à la voix » avec les boutons voix / chatbot) est rendue par `VoiceAssistantBanner`, insérée dans le flux de la page d'accueil.

- Suppression de ce bloc de l'accueil (rendu + entrée de section correspondante).
- Les boutons flottants IA (chatbot, commande vocale) restent inchangés.

## 2. Sécurité : le filigrane se réactive tout seul

Cause identifiée : la page Sécurité écrit les réglages directement en base, alors que le reste du site garde en mémoire une copie complète des réglages (avec l'ancienne valeur du filigrane). Dès qu'un autre réglage est sauvegardé — ou qu'un rafraîchissement automatique arrive — cette copie écrase la modification, donc `enabled` repasse à `true`. De plus, la page Sécurité réinitialise ses interrupteurs à chaque rafraîchissement automatique (toutes les 15 s), ce qui fait « revenir » visuellement l'état précédent.

Correctifs :
- Faire passer l'enregistrement de la section Sécurité par le même canal centralisé que les autres écrans admin, afin que la copie en mémoire soit mise à jour au même moment.
- Ne réinitialiser les champs du formulaire depuis la base que lorsqu'il n'y a pas de modification locale non enregistrée (plus d'écrasement pendant l'édition).
- Confirmation claire d'enregistrement, puis vérification : désactiver → recharger → doit rester désactivé ; réactiver → doit rester actif.
- Même traitement pour les options « blocage capture » et « clic droit désactivé » de ce panneau.

## 3. Rôles : tableau de bord réduit au périmètre du rôle

Les listes de routes par rôle existent déjà, mais elles sont trop larges (par ex. l'auditeur voit Sécurité et Rôles) et le menu est le seul filtre : une URL tapée à la main reste accessible.

- Resserrage des périmètres :
  - Préparateur : Dashboard, Préparations, Commandes (lecture).
  - Resp. stock : Dashboard, Stock, Produits (stock), Préparations, Commandes.
  - Valideur commandes : Dashboard, Commandes, Préparations, Clients, Colissimo.
  - Auditeur : lecture seule (Dashboard, Produits, Commandes, Clients, Audit, Erreurs) — sans Sécurité, Rôles, Paramètres.
- Blocage réel des routes : toute route hors périmètre redirige vers le tableau de bord, pas seulement masquée dans le menu.

## 4. Doublons de croix de fermeture

Les fenêtres Roulette et Carte à gratter ajoutent une croix personnalisée alors que la fenêtre de base en affiche déjà une → deux croix.

- Ajout d'une option « sans croix par défaut » sur le composant de fenêtre, utilisée par ces jeux (une seule croix, celle de la barre d'outils avec le son).
- Passage en revue des autres fenêtres du site pour supprimer les doublons du même type.

## 5. IA opérationnelle après mise en ligne

- Vérification que la clé Gemini est bien lue côté serveur (fonctions chat, voix, vision) et non depuis le navigateur.
- Test réel des fonctions chatbot et commande vocale avant publication, avec message d'erreur explicite en cas de clé manquante plutôt qu'un silence.
- Republication du site une fois les points 1 à 4 validés.

## Détails techniques

- `src/pages/Home.tsx` : retrait du rendu `voiceBanner` et de l'entrée de section.
- `src/pages/admin/AdminSecurity.tsx` : enregistrement via `useApp().flushDesignSettings` / `updateDesignSettings({ immediate: true })`, garde `dirty` sur l'effet de synchronisation.
- `src/pages/admin/Admin.tsx` : révision de `STOCK_MANAGER_ROUTES`, `PREPARATOR_ROUTES`, `AUDITOR_ROUTES`, `ORDER_VALIDATOR_ROUTES` + garde de route (`Navigate` si `!allowedHrefs.has(activeHref)`).
- `src/components/ui/dialog.tsx` : prop `hideClose` ; appliquée dans `RouletteFab.tsx` et `GameScratchFab.tsx`.
- Vérifications : typecheck, test Playwright (accueil + admin sécurité + roulette), test des fonctions IA.
