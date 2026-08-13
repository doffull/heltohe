# Footer : taille du logo + icônes en images

## Objectif
Pouvoir régler la taille du logo du footer, et remplacer les icônes des réseaux sociaux et les logos de paiement par vos propres images.

## 1. Taille du logo
- Nouveau réglage (curseur 20–160 px) dans **Admin → Footer → Marque & contact**, avec valeur par défaut identique à aujourd'hui (40 px).
- Le logo utilise cette hauteur dans toutes les dispositions (industrial, minimal, éditorial, etc.).

## 2. Icônes réseaux sociaux personnalisées
- Dans **Réseaux sociaux**, chaque ligne (Facebook, Instagram…) gagne un bouton « Image » ouvrant la médiathèque pour choisir une icône personnalisée (+ bouton retirer).
- Si une image est définie, elle remplace l'icône vectorielle ; sinon le comportement actuel est conservé.
- Réglage global de la taille des icônes sociales (curseur 12–48 px).

## 3. Logos de paiement personnalisés
- Dans **Paiement & avis**, en plus des logos intégrés (PayPal, CB, Visa…), une liste « Logos personnalisés » : ajouter des images via la médiathèque, définir un libellé (alt), réordonner, supprimer.
- Réglage de la hauteur des logos de paiement (curseur 12–64 px).
- Les images personnalisées s'affichent à la suite (ou à la place) des logos intégrés selon les cases cochées.

## Détails techniques
- Extension de `FooterConfig` / `FooterDesign` dans `src/types/index.ts` : `logoHeight`, `socialIconSize`, `paymentBadgeHeight`, `customPaymentBadges: { url, label }[]`, et `iconUrl` optionnel sur les entrées de `socialLinks`.
- `src/components/layout/Footer.tsx` : rendu conditionnel `<img>` vs icône dans `Socials`, hauteur du logo pilotée par style inline dans `Brand` et dans les dispositions `minimal`/`compact`.
- `src/components/layout/FooterPaymentBadges.tsx` : accepte `customBadges` et `height`, rend les images avec `alt` et fallback placeholder.
- `src/pages/admin/AdminFooter.tsx` : sliders + intégration `MediaLibraryDialog` (déjà utilisé pour le logo et l'image de fond).
- Aucune migration base de données : tout est stocké dans `footer_config` / `socialLinks` existants.
