## Plan

### 1. Bouton "Jeu du jour" mobile — rond + label dessous, à gauche
Dans `src/components/home/RouletteFab.tsx` :
- Détecter mobile via `useIsMobile()`.
- Sur mobile, forcer un rendu spécifique :
  - Petit cercle (~48px) avec uniquement l'icône cadeau au centre.
  - Label court (ex. "Jeu") en petit texte juste **en dessous** du rond, centré.
  - Position par défaut : coin bas-gauche (`corner: 'bl'`), avec un offset suffisant (ex. `x: 12`, `y: 96`) pour ne gêner ni la barre de navigation/onglets en bas, ni les CTA Acheter/Découvrir du Hero, ni le sidebar/chatbot à droite.
- Garder le drag admin (`useAdminDrag`) inchangé : si l'admin a déjà déplacé le bouton sur mobile (`position_mobile`), on respecte sa position ; sinon on applique le nouveau défaut bas-gauche.
- Conserver desktop/tablet tels quels (variant pill actuel).

### 2. Hero Techwear mobile — image ×2, couleurs/tailles compactes
Dans `src/styles/home-techwear.css` (bloc `@media (max-width: 768px)` et `@media (max-width: 480px)`) :
- **Image (carte) beaucoup plus grande** :
  - `--hw-card-width: min(100vw, 520px)` (full width)
  - `--hw-card-height: min(78svh, 640px)` (≈ 2× la taille actuelle)
  - Réduire le padding du wrapper et la marge basse pour maximiser la place visible.
- **Couleurs** : chips encore plus petits (ex. `min-height: 22px`, `padding: 2px 6px 2px 3px`, `font-size: 9px`, pastille couleur 12px).
- **Tailles** : `min-height: 26px`, `min-width: 30px`, `font-size: 10px`, gap réduit.
- **CTA Acheter / Découvrir** : encore plus discrets (`hw-cta-primary` ~28px de hauteur, `font-size: 10px` ; `hw-cta-secondary` ~22px, `font-size: 9px`), padding horizontal réduit.
- **Stats** : masquées ou ultra-compactes sur mobile (barres 1px, labels 8px) pour ne pas voler de place à l'image.
- Vérifier que le panneau couleurs/tailles reste **sous** l'image sans recouvrement (déjà géré par `position: static !important` sur `.hw-right`).

### 3. Vérification
- Viewport 360×621 : image occupe quasi tout l'écran ; sous l'image, panneau compact (couleurs + tailles + CTA petits) ; bouton "Jeu" en rond bas-gauche, label dessous, ne chevauche aucun autre FAB/CTA/nav.
- Drag admin et persistance par device toujours fonctionnels.

### Détails techniques
- Aucun changement backend, aucun changement de logique métier.
- Modifs purement CSS + un branchement conditionnel `isMobile` dans `RouletteFab.tsx` (markup différent + position par défaut différente).
- Pas de migration, pas de nouveau fichier.
