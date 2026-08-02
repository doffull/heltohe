## Objectif

Nouvelle disposition de la fiche produit, dans le style Industrial Luxury existant (Helvetica-MP, angles 45°, noir/blanc/gris) mais avec plus de couleur d'accent et d'icônes. **Aucune fonctionnalité retirée** — uniquement réorganisée et améliorée.

## Ordre mobile (360px et +)

```text
1  Fil d'ariane + Retour                (compact, icône)
2  BLOC IDENTITÉ    catégorie / SKU / TITRE / sous-titre / PRIX (+ remise, stock)
                    + mention rouge « Ni repris ni échangé » (enfant)
3  GALERIE          grand visuel plein format, swipe, pagination à points,
                    vignettes défilantes, badge vidéo, zoom plein écran
                    + bouton « ESSAYAGE VIRTUEL » en overlay sur la galerie
4  BLOC ACHAT       couleurs/variations → tailles (+ « Guide des tailles » et
                    « Trouver ma taille IA » juste à côté des tailles)
                    → quantité → AJOUTER AU PANIER (+ favoris / partage)
                    → coloris du même modèle (ColorVariantsStrip)
5  BLOC CONFIANCE   livraison / paiement sécurisé / délai / retour
                    (badges de confiance, icônes colorées)
6  BLOC INFOS       Description, Caractéristiques techniques, Matière, Entretien
                    en accordéons repliables (1er ouvert)
7  Avis clients, produits associés, recommandations, compléter le look
```

Barre d'achat collante en bas sur mobile (prix + taille choisie + Ajouter au panier) qui apparaît quand le bouton principal sort de l'écran.

## Tablette (≥768px) et Desktop (≥1024px)

- Deux colonnes collantes, pleine hauteur, sans débordement : galerie à gauche (sticky, vignettes verticales sur desktop / sous l'image sur tablette), colonne achat à droite (sticky).
- Colonne droite = identité → couleurs → tailles + guide des tailles → quantité + panier → essayage virtuel → badges de confiance.
- Sous les deux colonnes, pleine largeur : onglets/accordéons Description • Caractéristiques • Matière & Entretien, puis avis, coloris, associés, recommandations, look.
- Tablette : galerie 55% / achat 45% ; desktop : 3 colonnes de grille (galerie 2, achat 1).

## Détails techniques

- `src/pages/ProductDetail.tsx` : nouvelle structure de mise en page (un seul arbre, ordre piloté par la grille et non par des composants dupliqués, pour garder mobile et desktop synchronisés).
- Nouveaux composants dans `src/components/product/` :
  - `ProductHeaderBlock.tsx` — extrait le bloc identité/prix (réutilise `EditableProductField`, donc l'édition inline reste active).
  - `ProductBuyBox.tsx` — regroupe `ProductOptions`, guide des tailles, essayage virtuel, badges.
  - `ProductTrustBar.tsx` — badges de confiance avec icônes accentuées (source `getProductTrustBadges`).
  - `ProductInfoAccordion.tsx` — description / caractéristiques / matière / entretien (blocs vides masqués, visibles en mode admin comme aujourd'hui).
  - `MobileBuyBar.tsx` — barre d'achat collante mobile.
- `ProductImageGallery.tsx` : mode « grand écran + swipe » avec points de pagination, vignettes, conservation du zoom 3.5x, du watermark et du paramètre `?color=`.
- `ProductInfo.tsx` reste en place (utilisé par `ProductTemplateRenderer` et les tests) ; les props `headerOnly` / `detailsOnly` continuent de fonctionner.
- `VirtualTryOnButton` : conserve le flux actuel (sessionStorage, cadrage corps/hanches) mais devient aussi un bouton visible en ligne, pas seulement flottant.
- Couleurs/icônes uniquement via tokens sémantiques (`primary`, `accent`, `destructive`…) — aucune couleur codée en dur.
- Les tests existants `src/components/product/__tests__` sont mis à jour si nécessaire.

## Hors périmètre

Aucun changement de logique métier (panier, prix, stock, RPC, IA). Le rendu par template (`ProductTemplateRenderer`) n'est pas remplacé : la nouvelle disposition s'applique à la fiche produit standard, et le template « Showroom (copie) » reste disponible tel quel.
