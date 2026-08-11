# Passage du site en SSR (rendu côté serveur)

## Situation actuelle (vérifiée)

- Le site est une SPA Vite + React Router : `src/App.tsx` déclare toutes les routes côté navigateur, `index.html` ne contient qu'une coquille vide (`<div id="root">`).
- Les métadonnées par page passent par `react-helmet-async` (`src/components/seo/SeoHead.tsx`), donc elles n'existent que **après** exécution du JavaScript. Google les lit, mais LinkedIn/Facebook/Slack/WhatsApp ne voient qu'un titre générique.
- `SeoHead.tsx`, `public/sitemap.xml` et `public/robots.txt` pointent vers `https://helvetica-mp.helvetica-mp.net`, qui n'est pas un domaine valide : les canoniques et le sitemap actuels sont donc erronés.
- ~26 pages publiques + un espace admin complet (une cinquantaine d'écrans), éditeur live, pop-ups, PWA, paiements PayPal/PayPlug, Colissimo, Supabase.

## Ce que je vais faire

### 1. Migration technique vers le socle SSR (TanStack Start)

Le site passe du socle SPA au socle SSR de Lovable. Concrètement :

- Chaque route actuelle devient une route serveur : le HTML de la page (titre, description, contenu produit, prix, textes) est généré sur le serveur puis envoyé au visiteur et aux robots.
- Les pages publiques sont rendues côté serveur : accueil, boutique, fiches produits, catégories, collab, à-propos, contact, boutiques/store locator, fidélité, guide des tailles, pages légales.
- Les zones privées (`/admin/*`, `/compte/*`, `/panier`, `/checkout`, `/auth`) restent en rendu client à l'intérieur du nouveau socle : elles n'ont aucun intérêt SEO et dépendent de la session. Elles restent 100 % fonctionnelles.
- Tous les contextes existants (panier, auth, design settings, sidebar, méga menu, éditeur visuel) sont recâblés pour tolérer le rendu serveur (aucun accès à `window`/`localStorage` pendant le rendu).
- La PWA, le verrou de licence, l'obfuscation du build, les pop-ups et les widgets (chatbot, voix, FAB) sont réintégrés après migration.

### 2. SEO servi directement dans le HTML

- Titre, description, canonique et `og:*` propres à chaque page, écrits dans le HTML source.
- Fiches produits : JSON-LD `Product` (nom, image, prix, disponibilité) + `BreadcrumbList`. Accueil : `Organization`.
- L'interrupteur « visible sur Google » et le mode maintenance de `/admin/seo` continuent de fonctionner, mais deviennent réellement étanches (le `noindex` est posé côté serveur).

### 3. Correction du domaine

- Remplacement de `helvetica-mp.helvetica-mp.net` par **https://helvetica-mp.com** dans les canoniques, `og:url`, le sitemap et `robots.txt`.
- Sitemap généré dynamiquement (pages statiques + produits et catégories publiés), avec plafond du nombre d'URLs.
- À faire de votre côté : connecter `helvetica-mp.com` dans Réglages du projet → Domaines (sinon les canoniques pointeraient vers une adresse non servie).

## Déroulé et points de vigilance

- La migration se fait en une opération encadrée : le projet est basculé sur le nouveau socle, puis les pages sont portées les unes après les autres.
- C'est un chantier lourd : il faut prévoir une phase de vérification page par page après bascule (accueil, boutique, fiche produit, panier, checkout, admin, éditeur live).
- Les bibliothèques qui n'existent que côté navigateur (pdfjs, gifenc, leaflet, xlsx, Google Maps, générateur de GIF) sont chargées en import dynamique côté client uniquement.
- Google met généralement plusieurs jours à plusieurs semaines à recrawler et à répercuter les gains.

## Détails techniques

- Bascule sur le template TanStack Start (`vite.config.ts` via `@lovable.dev/vite-tanstack-config`, `src/routes/` en routage par fichiers, `src/server.ts` + `src/start.ts` avec capture d'erreurs SSR et page d'erreur autonome, `errorComponent` sur la route racine).
- `react-router-dom` remplacé par le routeur TanStack : `useNavigate`, `useLocation`, `useParams`, `<Link>` remplacés par leurs équivalents ; `AnimatePresence` conservé sur le layout racine.
- `react-helmet-async` remplacé par l'API `head` des routes TanStack ; `SeoHead.tsx` conservé sous forme d'utilitaire de calcul des balises (lecture de `design_settings`, `seo_indexable`, `maintenance_enabled`).
- Loaders de routes retournant uniquement des données sérialisables (identifiants/slugs, pas de composants ni de fonctions) ; les données produits/catégories sont préchargées côté serveur via le client Supabase puis hydratées dans React Query.
- `MaintenanceGate` déplacé en middleware de requête pour renvoyer la page de maintenance et le `noindex` côté serveur.
- Sitemap servi par une route serveur `/sitemap.xml` alimentée par Supabase, `robots.txt` mis à jour avec la nouvelle directive `Sitemap:`.
