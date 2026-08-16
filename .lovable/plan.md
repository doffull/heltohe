# Footer (icônes bancaires + newsletter), commande vocale IA, zoom produit mobile

## 1. Icônes de paiement du footer

Aujourd'hui les logos sont dessinés en SVG minimalistes (PayPal, CB, Visa, Mastercard, Apple Pay, 3D Secure) et chaque logo est enfermé dans une pastille blanche opaque (`bg-white/95 border`), ce qui donne cet effet « étiquette » sur le fond.

À faire :
- Nouveau jeu de logos vectoriels, plus fidèles et lisibles : **PayPal**, **PayPal Paiement en 3x**, **3D Secure**, **CB (Carte Bancaire)**, **Visa**, **Mastercard**, **Apple Pay**, **Google Pay**, **Colissimo** (livraison, affiché dans la même rangée ou dans une rangée « Livraison »).
- **Rendu transparent par défaut** : suppression du cadre/fond blanc, logos posés directement sur le fond du footer, en monochrome adaptatif (`currentColor`) avec option couleurs de marque.
- Réglages dans /admin/footer → onglet Paiement : afficher/masquer chaque logo, ordre, hauteur, style de fond (transparent / pastille claire / pastille sombre), remplacement par une image perso (déjà en place, conservé).
- Nouveaux logos activés par défaut : PayPal, PayPal 3x, CB, Visa, Mastercard, Apple Pay, Google Pay, 3D Secure, Colissimo.

## 2. Newsletter du footer

Bloc actuel : titre + phrase + champ email + bouton, sans retour visuel soigné.

Amélioration :
- Mise en page en encadré « industriel » (chanfrein, séparateur, icône enveloppe), champ et bouton alignés proprement en mobile (empilés) et desktop.
- État de chargement sur le bouton, message de succès inline (pas seulement un toast), validation email, honeypot + délai anti-spam conforme aux règles du projet.
- Ligne de réassurance sous le champ (« Désinscription en 1 clic · Pas de spam ») et compteur d'abonnés optionnel.
- Textes, sous-texte, libellé bouton et message de succès réglables depuis /admin/footer.

## 3. Commande vocale et fonctions IA (cause identifiée)

La fonction `voice-command` n'est pas déclarée dans la configuration des fonctions, elle exige donc un jeton d'authentification : tout **visiteur non connecté reçoit une erreur 401** avant même d'atteindre l'IA — d'où « ça ne marche pas » pour vos utilisateurs. Même situation pour `spin-roulette`, `verify-customer-info`, `image-pose-edit`, `generate-slide-text`, `generate-slide-image`, `generate-cta-style`, `template-from-mockup`, `parse-stock-pdf`.

À faire :
- Ouvrir l'accès public (sans jeton) aux fonctions destinées aux visiteurs : `voice-command`, `spin-roulette`, `verify-customer-info`.
- Ouvrir aussi les fonctions IA utilisées depuis l'admin qui échouent aujourd'hui (`generate-slide-text`, `generate-slide-image`, `generate-cta-style`, `image-pose-edit`, `template-from-mockup`, `parse-stock-pdf`) — la vérification des droits reste faite côté base (RLS) et par les contrôles existants dans chaque fonction.
- Laisser `payment-keys`, `paypal`, `payplug`, `crm-send-message`, `mcp`, webhooks tels quels (protégés / signature propre).
- Messages d'erreur clairs côté client : distinguer « micro refusé », « navigateur non compatible », « service IA momentanément saturé » (402/429) et afficher la solution de repli (chat IGRA) au lieu d'un échec silencieux.
- Vérification après correction : appel direct de la fonction sans jeton, puis test du parcours vocal complet dans le navigateur (recherche produit, ajout au panier, lecture du panier).

## 4. Zoom produit sur mobile

Comportement actuel : un double-tap ouvre un plein écran où l'image est simplement affichée à 200 % de largeur dans un conteneur `overflow-auto` avec `touch-action: pinch-zoom` — le pincement est capté par la page, pas par l'image, donc le zoom paraît inopérant, et le geste de balayage de la galerie interfère avec lui.

À faire :
- Visionneuse plein écran refaite avec un vrai moteur zoom/pan piloté par Pointer Events : pincement à deux doigts, double-tap pour zoomer/dézoomer (1x ↔ 2,5x ↔ 4x), glissement pour se déplacer, ancrage du zoom sur le point pincé, retour élastique aux bornes, `touch-action: none` sur la zone.
- Balayage gauche/droite pour changer d'image **uniquement à zoom 1x** (plus de conflit avec le pan).
- Bouton de fermeture, pastille de niveau de zoom, réinitialisation au changement d'image.
- Sur la vignette de la fiche produit : un simple tap ouvre la visionneuse (plus besoin de double-tap difficile), le zoom au survol reste inchangé sur ordinateur.
- Vérification sur viewport mobile réel (360 px) avec captures avant/après.

## Détails techniques

- `src/components/layout/FooterPaymentBadges.tsx` : refonte du registre de logos (ajout `paypal3x`, `googlepay`, `colissimo`), suppression du wrapper opaque, nouveau prop `badgeStyle: 'transparent' | 'light' | 'dark'` et `monochrome`.
- `src/types/index.ts` : `FooterConfig.paymentBadgeStyle`, `paymentBadgeMonochrome`, valeurs par défaut des `paymentBadgeItems` étendues ; champs newsletter supplémentaires (`newsletterSubText`, `newsletterSuccess`, `newsletterShowReassurance`).
- `src/components/layout/Footer.tsx` : nouveau rendu du bloc Newsletter (état `submitting`/`done`, honeypot, délai), passage des nouveaux props au bloc paiement.
- `src/pages/admin/AdminFooter.tsx` : onglet Paiement enrichi (style de fond, nouveaux logos), onglet Newsletter (nouveaux textes).
- `supabase/config.toml` : ajout des blocs `[functions.<nom>] verify_jwt = false` listés ci-dessus, puis redéploiement des fonctions concernées.
- `src/components/voice/VoiceCommandFab.tsx` : normalisation des erreurs (401/402/429/500) et repli explicite.
- `src/components/product/ProductImageGallery.tsx` : extraction d'un composant `ImageZoomViewer` (Pointer Events, `scale`/`offset` via refs, clamp + anchor sur le point de pincement), tap simple pour ouvrir, swipe conditionné au zoom 1x.
- Aucune migration de base de données.
