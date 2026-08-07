# Protection du code, vidéos, bannière haute et nouvelles sections d'accueil

Quatre chantiers indépendants.

## 1. Protection du code avant remise à l'autre entreprise

Trois couches combinées :

**a) Build compilé obfusqué**
- Ajout d'un mode de build `build:protected` qui produit un `dist/` minifié puis obfusqué (renommage des identifiants, chaînes encodées, suppression totale des noms de composants et des commentaires, pas de sourcemaps).
- Ce dossier est ce que l'hébergeur tiers déploie : aucun fichier source React n'est nécessaire pour servir le site.

**b) Verrou de domaine**
- Liste blanche de domaines autorisés (helvetica-mp.net, helvetica-mp.lovable.app, localhost pour le dev).
- Au démarrage, l'app vérifie le domaine courant. Sur un domaine non autorisé, l'app ne se monte pas et affiche un écran « Licence non valide — contactez le propriétaire ».
- Le contrôle est dupliqué à deux endroits différents du bundle obfusqué pour ne pas être neutralisé par une seule suppression.

**c) Licence et propriété**
- Fichier `LICENSE` propriétaire (tous droits réservés, interdiction de copie, revente, réutilisation ou dérivation).
- Bannière de copyright injectée en tête du bundle généré.
- Fichier `HANDOVER.md` : ce qui est livré, ce qui est interdit, instructions de déploiement du `dist/`.

**Limite à connaître, dite franchement :** tout code exécuté dans un navigateur est lisible. L'obfuscation + le verrou de domaine rendent la réutilisation coûteuse et détectable, mais la protection réellement opposable reste juridique (licence + NDA/contrat). Les clés sensibles restent côté serveur (Edge Functions), donc elles ne partent pas avec le code.

## 2. Cadrage des vidéos (contain / cover / fill / remplir)

- `HeroVideo` reçoit désormais `objectFit` et le respecte (aujourd'hui il force `cover`), y compris sur l'image de repli.
- Le slider transmet le `objectFit` du slide (le réglage existe déjà en base mais n'était pas appliqué aux vidéos).
- Réglages séparés mobile / desktop : `objectFit` + `objectPosition` par slide et par appareil, éditables dans l'admin design du hero.
- Même traitement appliqué aux autres vidéos du site (vidéos produit, blocs vidéo du page builder) via un composant vidéo partagé.

## 3. Bannière au-dessus du header : multi-messages avec icônes

- Nouveau modèle : liste de messages, chacun avec icône (choisie dans une bibliothèque : camionnette/livraison, cadeau, retours, bouclier, horloge, étoile…, ou aucune), texte, lien optionnel.
- Affichage : rotation automatique (un message à la fois) sur mobile, ou défilement/juxtaposition sur desktop — au choix.
- Correction mobile : texte sur une seule ligne, taille de police, espacement des lettres et hauteur réglables séparément pour mobile et desktop, plus troncature propre au lieu du retour à la ligne actuel.
- Messages préremplis dès la mise en place :
  - icône camionnette + « Livraison offerte en point relais »
  - « Enfant : ni repris ni échangé » (sans icône)

**Nouvelle section admin « Bannière haute »** (dans l'espace admin, accessible depuis le tableau de bord) : ajouter/supprimer/réordonner les messages en glisser-déposer, choisir l'icône, les couleurs, la vitesse de rotation, et les réglages typo mobile vs ordinateur, avec aperçu live.

## 4. Nouvelles sections de produits sur la page d'accueil

Ajout de : **Tendance**, **Cagoule**, **Sans manche**, **Veste**, **Survêtement** (en plus de Top ventes, Nouveautés, Catégories).

Remplissage hybride, comme demandé :
- par défaut, remplissage automatique par catégorie ou tag correspondant ;
- surcharge manuelle possible : sélection et ordre des produits section par section dans l'admin, qui prend alors le dessus.

Gestion admin :
- Chaque nouvelle section apparaît dans le gestionnaire de blocs de la page d'accueil, réordonnable en glisser-déposer, masquable, renommable.
- Même liste unique côté ordinateur et côté éditeur live mobile (même clé de configuration), donc pas de désynchronisation.
- Réglages d'affichage par section : titre, nombre de colonnes mobile / desktop, nombre de produits, défilement horizontal ou grille — pour que le rendu mobile reste lisible.

## Détails techniques

- Protection : `javascript-obfuscator` branché sur un script de build dédié, `terser` avec suppression des `console`, `build.sourcemap: false`, garde de licence dans `src/lib/licenseGuard.ts` appelé depuis `main.tsx` et depuis un second point d'entrée.
- Vidéos : `objectFit`/`objectPosition` propagés dans `HeroVideo.tsx` et `HeroSlider.tsx`, extension du type de slide avec variantes mobile.
- Bannière : nouveau champ `topBannerItems` dans `design_settings` (l'ancien `topBanner` est migré automatiquement vers un premier message), rendu extrait de `MainLayout.tsx` dans `components/layout/TopBanner.tsx`, admin `pages/admin/AdminTopBanner.tsx`.
- Sections : extension de `BUILTIN_LABELS` / `homePageBlocks` (`HomeBlocksEditor.tsx`, `SectionsEditorTab.tsx`, `useHomeBlocks.ts`) et de la table de correspondance tags/catégories dans `ProductSections.tsx`, curation via `homeSectionProducts` déjà en place.
- Une migration de base de données sera nécessaire uniquement pour les nouvelles colonnes de réglages dans `design_settings`.
