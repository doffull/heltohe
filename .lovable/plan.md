# Visibilité Google + Interrupteur SEO & Mode Maintenance

## Où en est le site aujourd'hui

Vérifications faites maintenant :

- Aucune connexion Google Search Console n'est reliée à ce projet Lovable — donc je n'ai aucune donnée sur l'indexation réelle (clics, impressions, pages indexées). Ce n'est pas une preuve que le site n'est pas indexé, juste une absence d'information.
- `public/robots.txt` autorise tous les robots (Googlebot, Bingbot inclus) : rien ne bloque le crawl.
- `index.html` porte un titre et une description, mais **aucune balise canonique**, et `<meta name="robots" content="noimageindex">` empêche l'indexation des images.
- **Aucun `sitemap.xml`** n'existe dans `public/` : Google doit découvrir les pages tout seul.
- L'app est une SPA React : le contenu des pages produit/catégorie est injecté en JavaScript, donc les métadonnées par page (titre, description) ne sont pas dans le HTML servi.

## Ce que je vais construire

### 1. Nouvelle page admin « SEO & Visibilité » (`/admin/seo`)

Un seul écran avec deux zones :

**Zone A — Visibilité Google**
- Un interrupteur principal : *Site visible sur Google* / *Site masqué de Google*.
- Quand il est sur « masqué », toutes les pages publiques reçoivent `<meta name="robots" content="noindex, nofollow">` et le sitemap n'est plus annoncé.
- Champs SEO éditables : titre du site, description, mot-clé principal, image de partage (og:image).
- Un état visuel clair (indexable / masqué) + rappel : Google met plusieurs jours à répercuter un changement.
- Bloc « Aller plus loin » : bouton d'aide expliquant comment connecter Google Search Console pour suivre l'indexation réelle et soumettre le sitemap.

**Zone B — Mode Maintenance**
- Interrupteur *Site en maintenance*.
- Champs : titre, message, date/heure de réouverture (facultatif), logo/visuel, couleur de fond.
- Case « Les administrateurs continuent de voir le site » (activée par défaut).
- Aperçu direct de la page de maintenance dans l'admin.

### 2. Page de maintenance publique

Quand le mode est actif, tout visiteur non-admin voit une page plein écran (design Industrial Luxury : blanc/noir/gris, angles 45°, Helvetica) avec le logo, le titre, le message, un compte à rebours si une date est renseignée, et les liens réseaux sociaux. Les routes `/admin/*` et `/auth` restent accessibles pour que vous puissiez reprendre la main. La page de maintenance est toujours en `noindex` pour que Google ne l'indexe pas à la place de votre boutique.

### 3. Améliorations SEO de base

- Ajout d'un `public/sitemap.xml` couvrant les pages statiques (accueil, boutique, collab, à-propos, contact, boutiques, pages légales) + directive `Sitemap:` dans `robots.txt`.
- Balise canonique auto-référente sur chaque route, et titre/description par page (produit, catégorie, boutique) via `react-helmet-async`.
- Retrait de `noimageindex` (vos visuels produits pourront apparaître dans Google Images) — je le laisse configurable dans l'admin si vous préférez le garder.
- JSON-LD `Organization` sur l'accueil et `Product` sur les fiches produit (nom, prix, disponibilité) pour les résultats enrichis Google.

## Détails techniques

- Nouvelles colonnes dans `design_settings` (déjà en lecture publique) : `seo_indexable`, `seo_noimageindex`, `seo_default_title`, `seo_default_description`, `seo_og_image`, `maintenance_enabled`, `maintenance_title`, `maintenance_message`, `maintenance_until`, `maintenance_image`, `maintenance_bg`, `maintenance_admin_bypass`. Mapping ajouté dans `useDesignSettings.ts` (`dbToSettings` + `settingsToDb`) et dans le type `DesignSettings`.
- Nouvelle page `src/pages/admin/AdminSeo.tsx`, route `seo/*` dans `src/pages/admin/Admin.tsx` + entrée dans le menu latéral admin, avec le même comportement de sauvegarde que les autres écrans (auto-save débouncé + barre de sauvegarde).
- Nouveau `src/components/seo/SeoHead.tsx` (react-helmet-async) monté dans `MainLayout`, qui lit le réglage `seo_indexable` et pose `robots`, `canonical`, `og:*` par route. `HelmetProvider` ajouté dans `src/main.tsx`.
- Nouveau `src/components/maintenance/MaintenanceGate.tsx` inséré dans `App.tsx` autour de `AnimatedRoutes` : laisse passer `/admin/*`, `/auth` et les admins (via `useAuth().isAdmin`) si le bypass est actif.
- `public/sitemap.xml` statique avec les URLs de `https://lvtk2026.helvetica-mp.net`, sans `lastmod` (pas de date de modification fiable par page).

## Limite à connaître

Le `noindex` posé côté client fonctionne pour Google (qui exécute le JavaScript), mais pas pour les robots qui ne lisent que le HTML brut (aperçus LinkedIn/Slack/Facebook). Pour un masquage 100 % étanche au niveau du HTML servi, il faudrait un rendu serveur — je peux vous expliquer l'option de migration TanStack Start si ça devient nécessaire.
