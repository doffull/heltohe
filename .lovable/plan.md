## Objectif

Rendre la page `/admin/home-icons` 100% fonctionnelle :
1. le bouton flottant unifié apparaît bien côté user quand il est activé,
2. les 5 modes (Dock glass / Socle / Groupés / Cluster CTA / Libres) s'appliquent réellement et instantanément,
3. **tout ce qui est cliquable redirige** vers l'éditeur concerné (sections, héros, blocs, etc.) — création des routes/pages manquantes si besoin.

## Diagnostic (constats du code actuel)

- `src/components/layout/UnifiedFab.tsx` **n'honore pas** `cfg.enabled`. Le toggle "Activé" dans l'éditeur ne fait donc rien → l'utilisateur croit l'avoir activé alors qu'il l'était déjà, et inversement.
- Les modes (`dock`, `socle`, `grouped`, `cluster`, `free`) sont bien câblés dans `UnifiedFab.tsx`, mais sauvegardés **en debounce 800 ms via `updateDesignSettings`** sans flush DB explicite → après reload ou autre onglet, l'état semble ne pas avoir changé. De plus, plusieurs modes (cluster/dock) lisent `clusterPos_*`/`dockPos_*` qui ne sont jamais initialisés à la 1ère sélection → bouton peut se positionner hors écran et paraître invisible.
- `cfg.position_desktop/mobile` peut contenir une valeur Y > viewport (slider va jusqu'à 200) → FAB visible mais sous le footer mobile (360 px de large, user vient de scroller).
- `HomeBlocksEditor` affiche un œil (visible/visible) qui **n'est qu'un indicateur**, pas un lien vers l'éditeur de ce bloc (Hero, Catégories, Flash, etc.). Aucune redirection.
- `HomeCustomSectionsEditor` (à confirmer) édite les sections sur place, mais aucun lien rapide vers l'admin page concernée.
- Boutons custom (`home_fab_buttons`) : l'éditeur fonctionne, mais aucun message clair quand `action_type=route` pointe vers une route 404.

## Plan d'action

### 1. Faire respecter `enabled` + reset positions invalides
- `UnifiedFab.tsx` : early return si `cfg.enabled === false`.
- Si `cfg.position_desktop.y > 600` ou `cfg.position_mobile.y > 400`, clamp + toast admin "Position corrigée".
- Initialiser `clusterPos_*` / `dockPos_*` à un coin visible (`br` / `bc`) au **premier passage** dans ces modes.

### 2. Sauvegarde immédiate des changements de mode
- Dans `UnifiedFabEditor.tsx`, supprimer le délai pour les changements **structurants** (`enabled`, `mode`) : flush DB direct + invalidation cache → mode visible sans recharger.
- Garder le debounce 800 ms uniquement pour les sliders (taille, blur, offset, couleurs).
- Ajouter un petit badge live « Aperçu mis à jour » qui se ferme tout seul.

### 3. Audit complet "tout est cliquable" (page Icônes Accueil)
Sur chaque bloc de la page, ajouter un bouton/lien **« Éditer »** qui redirige vers la sous-route admin la plus pertinente :

| Bloc dans `AdminHomeIcons` | Action ajoutée | Route cible (créer si absente) |
| --- | --- | --- |
| `HomeBlocksEditor` → ligne « Hero » | bouton ✎ | `/admin/design#techwear-hero` (onglet `TechwearHeroTab`) |
| ligne « Categories » | bouton ✎ | `/admin/categories` |
| ligne « Featured / NewArrivals » | bouton ✎ | `/admin/products` |
| ligne « Flash » | bouton ✎ | `/admin/marketing#flash` |
| ligne « Loyalty » | bouton ✎ | `/admin/marketing#fidelite` |
| ligne « Newsletter » | bouton ✎ | `/admin/marketing#newsletter` |
| ligne « VoiceBanner » | bouton ✎ | scrolle vers `UnifiedFabEditor` (ancre `#unified-fab`) |
| ligne « custom:... » | bouton ✎ | ouvre directement `HomeCustomSectionsEditor` dépliée sur la section |
| Œil (👁) | reste un toggle visible/masqué (clarifié par tooltip) |  |
| `UnifiedFabEditor` → bouton Roulette | lien rapide « Configurer le jeu » | `/admin/roulette` |
| `UnifiedFabEditor` → toggle Chat | lien « Configurer l'IA » | `/admin/chatbot` |
| `UnifiedFabEditor` → toggle Voix | lien « Paramètres voix » | `/admin/settings#voice` |
| Carte d'un bouton custom (liste) | titre cliquable = ouvrir éditeur | déjà OK, ajouter raccourci « Tester l'action » qui exécute `handleAction` |
| `FabLivePreview` | clic sur un bouton de l'aperçu = scroll vers son éditeur | nouveau |

### 4. Création des ancres manquantes
- `AdminDesign.tsx` : ajouter `id="techwear-hero"`, scroll-margin pour `scrollIntoView`.
- `AdminMarketing.tsx` : ajouter ancres `#flash`, `#fidelite`, `#newsletter`.
- `AdminSettings.tsx` : ancre `#voice`.
- `AdminHomeIcons.tsx` : ancres `#sections`, `#custom`, `#unified-fab`, `#custom-fabs`.

### 5. Validation + UX
- Toast d'erreur clair quand `action_value` d'un bouton custom pointe vers une route invalide (vérif via liste blanche des routes connues).
- Tooltip explicatif sur chaque mode du `UnifiedFabEditor` décrivant en 1 phrase ce qu'il fait.
- Bouton **« Tester sur la home »** en haut de la page = `window.open('/', '_blank')`.

## Fichiers touchés

- `src/components/layout/UnifiedFab.tsx` (respect `enabled`, clamp positions, init cluster/dock)
- `src/components/admin/UnifiedFabEditor.tsx` (flush immédiat des changements structurants, tooltips, liens contextuels)
- `src/components/admin/HomeBlocksEditor.tsx` (bouton ✎ par ligne + navigate)
- `src/components/admin/HomeCustomSectionsEditor.tsx` (déplier sur ancre)
- `src/components/admin/FabLivePreview.tsx` (clic = scroll vers éditeur)
- `src/pages/admin/AdminHomeIcons.tsx` (ancres, bouton "Tester")
- `src/pages/admin/AdminDesign.tsx`, `AdminMarketing.tsx`, `AdminSettings.tsx` (ancres `id=`)

Aucune migration DB nécessaire — uniquement frontend.

## Hors périmètre
- Refonte des autres tableaux admin (Produits, Commandes…).
- Drag-and-drop nouveau (déjà OK).
- Templates de pages (déjà livré séparément).
