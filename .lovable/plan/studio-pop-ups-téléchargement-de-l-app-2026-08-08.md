# Studio Pop-ups + téléchargement de l'app

Objectif : un vrai studio de pop-ups dans l'admin (images, vidéos, GIF, textes animés déplaçables, typos, couleurs) capable de servir tous les usages — promo, nouveau produit, newsletter, commande vocale, chatbot, installation de l'app — plus un accès clair au téléchargement de l'application depuis le footer.

## 1. Footer : télécharger l'application

- Nouveau bloc « Télécharger l'application » dans le footer (icône + libellé, style Industrial Luxury existant).
- Au clic :
  - Android/Chrome : déclenche le prompt d'installation natif si disponible.
  - iOS/Safari : ouvre une petite modale avec les 2 étapes (Partager → Sur l'écran d'accueil).
  - Desktop : modale avec QR code du site à scanner sur mobile + instructions.
- La logique d'installation actuelle (bannière mobile) est extraite dans un hook partagé pour éviter les doublons ; masqué automatiquement si l'app est déjà installée.

## 2. Studio Pop-ups (admin)

Nouvelle page `/admin/popups` (aussi accessible depuis l'onglet Pop-ups de Marketing), avec une liste de campagnes et un éditeur visuel.

Éditeur (canvas WYSIWYG) :
- Canevas au format choisi (carré, portrait, paysage, plein écran, barre basse), aperçu mobile/desktop commutable.
- Calques ajoutables : texte, image, vidéo, GIF, bouton, champ email, compte à rebours, code promo.
- Chaque calque est déplaçable/redimensionnable en drag and drop, avec réglages : position, taille, rotation, opacité, z-index.
- Texte : typo (liste de polices du site + Google Fonts sélectionnées), taille, graisse, casse, alignement, couleur, ombre, animation d'entrée (fade, slide, zoom, machine à écrire, lueur) avec délai et durée.
- Médias : upload direct (drag and drop) images/vidéos/GIF via la médiathèque existante, réglages contain/cover/remplir, lecture auto, boucle, muet.
- Fond : couleur, dégradé, image, vidéo, flou d'arrière-plan, overlay.
- Boutons : libellé, style, action (lien interne/externe, ajouter au panier, ouvrir le chatbot, lancer la commande vocale, installer l'app, s'inscrire à la newsletter).
- Annuler/rétablir, dupliquer une campagne, modèles de départ prêts à l'emploi : Promo, Nouveau produit, Newsletter, Commande vocale, Chatbot, Installer l'app.

Diffusion et ciblage :
- Déclencheurs : au chargement, après délai, scroll %, intention de sortie, inactivité, Nième visite, ajout au panier.
- Fréquence (jours), nombre max d'affichages, priorité entre campagnes.
- Ciblage : pages (accueil, boutique, fiche produit, panier, catégorie), appareil (mobile/desktop), visiteur connecté ou non, plage de dates, langue.
- Activation/désactivation immédiate, aperçu en direct sur le site.

Statistiques par campagne : affichages, clics, fermetures, conversions (inscriptions, clics CTA), taux de conversion.

## 3. Côté visiteur

- Un hôte unique de pop-ups remplace l'hôte newsletter actuel : sélectionne la campagne éligible la plus prioritaire, respecte fréquence/ciblage, n'affiche jamais plus d'une pop-up à la fois et jamais pendant une session de chat ou dans l'admin.
- Rendu fidèle à l'éditeur (calques positionnés, animations, médias), fermeture accessible, respect de `prefers-reduced-motion`.
- Formulaire email conservé avec protection anti-spam existante (honeypot + délai).
- Actions spéciales branchées sur l'existant : ouverture du chatbot, activation de la commande vocale, installation de l'app.

## Détails techniques

- Base de données : table `popup_campaigns` (nom, type, statut, contenu JSON des calques, format, fond, déclencheur, ciblage, dates, priorité, fréquence, max_vues) + `popup_events` (view/click/dismiss/convert, session). RLS : lecture publique restreinte aux campagnes actives, écriture réservée aux admins, insertion d'événements autorisée pour tous ; GRANT explicites sur les deux tables.
- Les pop-ups newsletter existantes (`newsletter_popups`) sont migrées automatiquement en campagnes de type `newsletter` ; l'ancien composant est retiré au profit du nouvel hôte.
- Nouveau code : `src/hooks/usePopupCampaigns.ts`, `src/components/popups/PopupHost.tsx` + moteur de rendu de calques, `src/components/admin/popups/` (liste, éditeur canvas, panneaux de calques/style/diffusion), `src/pages/admin/AdminPopups.tsx`, `src/hooks/useInstallApp.ts` partagé avec `InstallAppBanner`.
- Uploads via `useFileUpload`/`FileDropZone` (bucket `media`, dossier `popups`), limites de taille vidéo existantes conservées.
- Aucune couleur codée en dur : tokens sémantiques, sauf couleurs choisies par l'admin pour une campagne.
