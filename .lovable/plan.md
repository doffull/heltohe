# Footer 100 % gérable : lignes libres, logos remplaçables, admin plein écran

## Ce qui bloque aujourd'hui (vérifié dans le code)

- La page `/admin/footer` est enfermée dans une largeur `max-w-5xl` : sur un écran 1588 px, les cartes et les champs sont rétrécis et certains contrôles paraissent coupés.
- La disposition « Personnalisé » empile les blocs **un par ligne**. Impossible de mettre « Suivez-nous » et « Paiement sécurisé » côte à côte.
- Les logos de paiement intégrés (PayPal, CB, Visa, Mastercard, Apple Pay, 3D Secure) sont dessinés en dur : on peut seulement **ajouter** des logos images à côté, pas remplacer un logo précis par sa propre image.
- Le bouton « Télécharger l'application » est figé (libellé, icône, style) et n'est réglable que par un interrupteur on/off.
- Les logos de réseaux sociaux acceptent déjà une image personnalisée (bouton « Image ») — cette partie fonctionne, elle sera juste rendue plus visible.
- Les colonnes de liens sont limitées à 4, sans largeur ni alignement par colonne.

## Ce que je vais construire

### 1. Constructeur de lignes (le cœur)

Nouvelle vue « Disposition » : le footer devient une **liste de lignes**, chaque ligne contenant 1 à 4 blocs côte à côte.

```text
Ligne 1 :  [ Marque 50% ]      [ Colonnes 50% ]
Ligne 2 :  [ Suivez-nous 1/2 ] [ Paiement sécurisé 1/2 ]   <- côte à côte
Ligne 3 :  [ Newsletter 100% ]
Ligne 4 :  [ Barre du bas ]
```

Pour chaque ligne : ajouter/supprimer, monter/descendre, choisir l'espacement et un séparateur.
Pour chaque bloc dans la ligne : choisir son type (marque, colonnes de liens, réseaux, newsletter, paiement, avis, Trustpilot, liens légaux, barre du bas, bouton app, **texte libre**, **image libre**), sa largeur (1/4, 1/3, 1/2, 2/3, plein), son alignement, et le déplacer d'une ligne à l'autre.

Deux nouveaux types de blocs libres permettent de mettre n'importe quel texte ou n'importe quelle image où l'on veut (avec lien optionnel, largeur d'image réglable).

Le mode « ligne par ligne » remplace la simple liste d'ordre actuelle ; les réglages existants (ordre + affichage + alignement) sont convertis automatiquement en lignes pour ne rien perdre.

### 2. Logos de paiement entièrement remplaçables

Chaque badge (PayPal, CB, Visa, Mastercard, Apple Pay, 3D Secure) devient une ligne d'édition avec : afficher/masquer, ordre, libellé, **remplacer par mon image** (choix depuis la médiathèque ou upload), largeur/hauteur propre. Plus la possibilité d'ajouter des badges 100 % personnalisés, comme aujourd'hui.

### 3. Réseaux sociaux

Même traitement, clarifié : image personnalisée par réseau (déjà présent), taille par réseau, ordre, plus un choix de forme du bouton (cadre, cercle, sans cadre) et le titre du bloc.

### 4. Bloc « Télécharger l'application »

Devient un bloc placeable dans n'importe quelle ligne, avec libellé, sous-texte, icône ou image personnalisée, style (bouton plein, contour, texte) et taille.

### 5. Aperçu temps réel

Panneau d'aperçu du footer **collé en bas de la page admin** (repliable, largeur mobile/tablette/desktop) qui rend le vrai composant `Footer` avec les réglages en cours : chaque modification se voit immédiatement, avant même la sauvegarde.

### 6. Admin en pleine largeur

Suppression de la limite de largeur sur la page Footer et alignement sur le reste du tableau de bord, pour que tous les contrôles soient accessibles sur ordinateur (grilles 2-3 colonnes sur grand écran, listes déroulantes qui ne débordent plus).

## Détails techniques

- `src/types/index.ts` : nouveaux types `FooterBlock` (`{ id, type, width, align, visible, props }`), `FooterRow` (`{ id, blocks, gap, divider }`) ; `FooterConfig.rows?: FooterRow[]`, `paymentBadgeItems?: {key,label,iconUrl,height,visible}[]`, `installApp?: {label,subLabel,iconUrl,variant,size}`, `socialItems` enrichis (`shape`, `size` par item). Les anciens champs restent lus en repli.
- `src/lib/footerLayout.ts` (nouveau) : migration `sectionOrder`/`sectionAlign`/`show*` → `rows`, et valeurs par défaut par preset.
- `src/components/layout/Footer.tsx` : nouveau moteur de rendu `renderRows()` (grille `flex flex-wrap` + largeurs en fractions, responsive : empilement < 768 px) utilisé quand `cfg.rows` existe ; les blocs actuels (`Brand`, `Columns`, `Socials`, `Newsletter`, `PaymentsBlock`, `ReviewsBlock`, `LegalBar`, `BottomBar`) sont réutilisés tels quels + deux nouveaux (`TextBlock`, `ImageBlock`, `InstallBlock`). Les 6 presets existants continuent de fonctionner.
- `src/components/layout/FooterPaymentBadges.tsx` : accepte `items` avec `iconUrl` par badge, repli sur les SVG intégrés.
- `src/pages/admin/AdminFooter.tsx` : retrait de `max-w-5xl`, nouvel onglet « Disposition » avec l'éditeur de lignes/blocs (contrôles haut/bas/gauche/droite, largeur, alignement, duplication, suppression), refonte des onglets Paiement et Réseaux avec sélecteur d'image par élément (réutilise le `MediaPicker` déjà utilisé dans la page), panneau d'aperçu temps réel.
- Aucune migration : tout est stocké dans la colonne `footer_config` (jsonb) déjà existante ; même stratégie de sauvegarde (auto-save + barre d'enregistrement).
- Repli sûr : si `rows` est vide ou invalide, le footer actuel s'affiche à l'identique.
