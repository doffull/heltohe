# App installable sur l'écran d'accueil (PWA — installation seulement)

Le site devient installable sur iOS et Android depuis le navigateur : icône sur l'écran d'accueil, lancement en plein écran sans barre d'adresse, sans passer par l'App Store ni le Play Store. Pas de mode hors-ligne (choix retenu) — donc aucun risque de contenu figé ou de cache obsolète après une publication.

## Ce qui sera ajouté

1. **Manifeste d'application** (`public/manifest.webmanifest`)
   - Nom : `HELVETICA MOUNTAIN PIONEERS`, nom court : `HELVETICA`
   - `display: standalone`, `start_url: /`, `scope: /`
   - Couleur de thème `#ffffff`, fond `#ffffff` (cohérent avec le thème clair forcé du site)
   - Orientation portrait, langue `fr`
   - Raccourcis d'app (appui long sur l'icône) : Boutique, Collab, Mon compte

2. **Icônes** générées depuis le logo que tu envoies, déposées dans `public/` :
   - `icon-192.png`, `icon-512.png` (Android / Chrome)
   - `icon-512-maskable.png` (icône adaptative Android, avec marge de sécurité)
   - `apple-touch-icon.png` 180×180 (iOS)
   - `favicon.png` en remplacement du favicon par défaut

3. **Balises `<head>` dans `index.html`**
   - `<link rel="manifest">`, `<link rel="apple-touch-icon">`, favicon
   - `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`
   - Correction au passage : `og:url` pointe encore vers `helvetica-mp.helvetica-mp.net` → remplacé par le domaine réel `helvetica-mp.net`

4. **Invitation à installer** (composant discret, mobile uniquement)
   - Android/Chrome : bandeau bas « Installer l'application » branché sur l'événement natif `beforeinstallprompt`
   - iOS/Safari : mini-tutoriel « Partager → Sur l'écran d'accueil » (iOS n'expose pas de prompt automatique)
   - Style Industrial Luxury (noir/blanc, angles 45°), fermable, mémorisé en `localStorage`, masqué quand l'app tourne déjà en mode installé, et jamais affiché dans l'aperçu Lovable ni sur `/admin`

## Détails techniques

- Aucun service worker, aucun plugin PWA, aucun cache applicatif : uniquement manifeste + icônes + balises head, conformément au choix « installation seulement ».
- Les icônes sont produites par redimensionnement du logo fourni (padding centré, pas d'étirement) et versionnées dans `public/`.
- Le composant d'invitation sera monté dans `MainLayout`, sous le gate de maintenance, sans toucher aux FAB existants (`FabStack` / `UnifiedFab`) pour éviter tout chevauchement : il s'affiche en bandeau bas pleine largeur et se retire dès fermeture.
- Détection du mode installé via `matchMedia('(display-mode: standalone)')` et `navigator.standalone` (iOS).

## À faire de ton côté

Envoie ton logo (image carrée, idéalement 1024×1024, PNG). Je génère toutes les tailles d'icônes à partir de ce fichier. L'installation est testable uniquement sur le site **publié** (les navigateurs exigent HTTPS et un domaine réel, pas l'aperçu en iframe).
