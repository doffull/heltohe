# Bandeau cookies + gestion du consentement (RGPD/CNIL)

Objectif : un bandeau/pop-up de consentement conforme, avec choix par catégorie, mémorisation du choix, et respect du consentement par les outils de mesure.

## 1. Pop-up de consentement (visiteur)

- S'affiche à la première visite, en bas de l'écran (style Industrial Luxury : noir/blanc, angles 45°), au-dessus du reste mais jamais dans l'admin.
- Trois actions : « Tout accepter », « Tout refuser », « Personnaliser ».
- Panneau « Personnaliser » avec interrupteurs par catégorie :
  - Essentiels (toujours actifs, non désactivables)
  - Mesure d'audience / statistiques
  - Personnalisation
  - Tiers (cartes, réseaux, vidéos)
- Lien vers la Politique de cookies et la Politique de confidentialité.
- Le choix est mémorisé (durée 6 mois, conforme CNIL) puis le bandeau ne réapparaît plus jusqu'à expiration ou changement de version des finalités.
- Accessible : focus piégé, fermeture au clavier, respect de `prefers-reduced-motion`.

## 2. Modifier ses choix à tout moment

- Lien « Gérer mes cookies » dans le footer (bloc liens légaux) et depuis la page Politique de cookies : rouvre le panneau de préférences.

## 3. Respect du consentement

- Le suivi visiteurs actuel (`useVisitorTracking`) ne se déclenche plus que si la catégorie « statistiques » est acceptée.
- Les pop-ups marketing existants restent affichés seulement après une décision de l'utilisateur, pour ne pas se superposer au bandeau cookies.
- Les intégrations tierces (Google Maps du localisateur de boutiques, widgets d'avis) ne se chargent qu'avec la catégorie « tiers » acceptée, sinon un encart propose d'activer.

## 4. Correction de contenu

Les pages légales contiennent une erreur de texte : le mot « cookie(s) » a été remplacé par « il(s) » (ex. « Ce site utilise des ils »). Correction des occurrences dans la politique de cookies et la politique de confidentialité.

## 5. Réglages admin

Dans /admin/seo (ou la section paramètres existante) : activer/désactiver le bandeau, titre et texte personnalisables, catégories proposées, durée de mémorisation, position (bas / centre modale).

## Détails techniques

- Nouveau contexte `src/context/CookieConsentContext.tsx` : état du consentement, persistance `localStorage` (`hmp_cookie_consent` avec version + date), API `open()`, `accept()`, `reject()`, `update(categories)`, hook `useCookieConsent()`.
- Nouveaux composants : `src/components/legal/CookieConsentBanner.tsx` (bandeau + panneau de préférences), monté dans `MainLayout.tsx` avant `PopupHost`.
- `useVisitorTracking` reçoit `enabled: !isAdmin && consent.statistics`.
- Aucune couleur codée en dur : tokens sémantiques existants.
- Pas de nouvelle table : le consentement reste côté client (aucune donnée personnelle stockée en base) ; les libellés du bandeau sont lus depuis `design_settings` comme les autres réglages.
