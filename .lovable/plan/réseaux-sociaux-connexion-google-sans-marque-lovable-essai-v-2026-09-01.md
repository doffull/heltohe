# Réseaux sociaux, connexion Google sans marque Lovable, essai virtuel fiable

## 1. Espace admin « Réseaux sociaux » (site entier)

Aujourd'hui les liens sociaux ne sont saisissables que dans Admin → Footer, et ne servent qu'au pied de page.

- Nouvelle section **Admin → Réseaux sociaux** (`/admin/reseaux-sociaux`) : un seul endroit pour saisir Instagram, TikTok, Facebook, X, YouTube, Pinterest, LinkedIn, WhatsApp, Snapchat, Threads + liens libres.
- Pour chaque lien : plateforme (icône auto), URL, libellé, visible oui/non, ordre par glisser-déposer.
- Réglages d'affichage : où les montrer (pied de page, en-tête, menu mobile, page Contact, pop-ups, page maintenance), style d'icônes (taille, forme, couleur), ouverture dans un nouvel onglet.
- Ces liens alimentent automatiquement le footer existant (l'onglet Footer garde son affichage mais lit la source centrale), le balisage SEO `sameAs` déjà présent, et la page Contact.
- Sauvegarde automatique immédiate, comme les autres espaces admin.

## 2. Connexion Google et suppression de la marque Lovable

- **Connexion Google avec votre propre identité** : je configure le fournisseur Google du backend avec vos identifiants Google Cloud (Client ID + Client Secret d'un OAuth 2.0 Web). L'écran de consentement affichera alors « HELVETICA-MP » au lieu de la marque Lovable, et le bouton passera par votre projet Google.
  - À me fournir : Client ID et Client Secret Google. URL de redirection à coller côté Google : l'URL de callback du backend (je vous la donne précisément au moment de la configuration).
- **Badge Lovable du site publié** : désactivé dans les réglages de publication.
- **Page de connexion** : nettoyage de tout visuel/texte tiers, logo HELVETICA-MP en haut, mentions légales à vous.
- Vérification réelle : parcours de connexion Google testé de bout en bout après configuration.

## 3. Essai virtuel : refonte de la qualité

Problèmes constatés : le rendu ne respecte ni la morphologie, ni la photo du client, ni les détails du produit.

- **Fidélité du produit** : envoi de plusieurs vues du produit (image principale + galerie + visuel de la couleur choisie) au lieu d'une seule, et instructions renforcées sur le respect exact des logos, coutures, matières, coupe et couleur.
- **Fidélité au client** : verrouillage explicite du visage, de la coiffure, de la carnation, des mains, du décor et du cadrage ; refus des recadrages fantaisistes.
- **Morphologie réellement prise en compte** : la taille, le poids, le genre et la morphologie saisis sont traduits en gabarit décrit précisément (épaules, tour de poitrine/taille estimé, aisance du vêtement selon la taille choisie S/M/L) et non plus en simple mention.
- **Qualité de l'entrée** : contrôles avant génération (photo nette, corps entier ou buste selon le cadrage, une seule personne, éclairage suffisant) avec message clair si la photo ne convient pas, plus cadrage/redimensionnement automatique côté navigateur.
- **Deux passes** : une première génération puis une passe de correction qui compare au produit d'origine et corrige couleur/détails ; option « Régénérer » et « Améliorer » côté client.
- **Retour utilisateur** : étapes visibles (analyse, habillage, finition), temps d'attente annoncé, messages d'erreur explicites (trop de requêtes, crédits, photo inadaptée).
- Le mode mannequin bénéficie des mêmes améliorations, avec le layering multi-pièces conservé.

## Détails techniques

- Base : nouvelle table `social_links` (plateforme, url, libellé, ordre, actif) + réglages d'affichage dans `design_settings.settings_json.socialDisplay`. RLS : lecture publique, écriture réservée aux admins via `has_role`, GRANT explicites. Migration de recopie des `design_settings.social_links` existants.
- Front : `src/hooks/useSocialLinks.ts`, `src/pages/admin/AdminSocials.tsx`, composant partagé `SocialLinksRow.tsx` ; `Footer.tsx`, `SeoHead.tsx`, `Contact.tsx`, `MaintenancePage.tsx` consomment la source centrale. Entrée ajoutée dans `src/config/adminSections.ts` et la sidebar admin.
- Auth : configuration du provider Google du backend avec vos identifiants (remplace le flux géré par Lovable dans `src/pages/Auth.tsx`, bascule sur `supabase.auth.signInWithOAuth` avec `redirectTo = ${window.location.origin}/`), et badge de publication désactivé.
- Essai virtuel : refonte des prompts et du pipeline dans `supabase/functions/virtual-tryon/index.ts` (multi-images produit, passe de raffinement, gabarit morphologique calculé), pré-traitement image dans `VirtualTryOnButton.tsx` / `MannequinTryOn.tsx`. Modèle image Lovable AI conservé, gestion 429/402 maintenue.
