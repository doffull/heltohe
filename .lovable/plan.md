# Section « Nos boutiques », alignement des titres, footer et badges

## 1. Rendre la section « Nos boutiques (recherche + carte) » configurable

Aujourd'hui le bloc `storeFinder` apparaît dans la liste des sections de la page d'accueil, mais aucun panneau de réglages ne s'ouvre (seul le bloc `categories` possède un éditeur inline). On ajoute un éditeur inline pour ce bloc, avec :

- Eyebrow (`// BOUTIQUES`), titre, sous-titre modifiables
- Image de fond de la section (upload via la médiathèque) + opacité de voile et hauteur
- Alignement du bloc de titre : gauche / centre / droite (gauche par défaut)
- Affichage des boutons « Près de chez moi » / « Toutes les boutiques » et du lien vers la page boutiques

La section lira ces réglages depuis les settings du bloc, comme le fait déjà la grille de catégories.

## 2. Alignement des titres de catégories

Ajout d'un réglage « Alignement du titre » (gauche / centre / droite) dans l'éditeur du bloc Catégories, appliqué :

- au titre de la section « // CATÉGORIES »
- au titre affiché sur chaque carte de catégorie

Valeur par défaut : **gauche** partout, comme demandé.

## 3. Disposition du footer

Dans l'espace Footer de l'admin, onglet « Presets & disposition » :

- Réorganisation des colonnes par glisser-déposer (en plus des flèches actuelles)
- Choix du nombre de colonnes affichées (2, 3, 4) et de la largeur relative (égales / marque plus large)
- Réordonnancement des blocs du footer (marque, colonnes de liens, newsletter, réseaux sociaux, paiement sécurisé, avis clients)
- Alignement du contenu déjà présent conservé, avec application effective dans le footer public

## 4. Retirer les badges « Tendance » & co.

Les badges d'état produit (Promo, Nouveau, Top vente, Tendance, Stock limité, Exclusivité, Épuisé) sont masqués globalement : fiches produit et cartes produit de la boutique, page d'accueil, catégories et pages construites.

Un interrupteur « Afficher les badges d'état produit » est ajouté dans l'espace Badges de l'admin, **désactivé par défaut**, pour pouvoir les réactiver plus tard. Les badges de confiance (livraison, paiement, retour) et le badge « Limited Edition » Collab ne sont pas touchés.

## Détails techniques

- `src/components/admin/HomeBlocksEditor.tsx` : nouvel éditeur inline `StoreFinderBlockInlineEditor`, ajout de `storeFinder` à `INLINE_EDITABLE`, nouveau champ `titleAlign` dans `CategoriesBlockInlineEditor`.
- `src/components/home/StoreFinderSection.tsx` : lecture de `homePageBlocks → storeFinder.settings` (titre, image, alignement, toggles), image de fond en couche absolue avec voile.
- `src/components/home/CategoryGrid.tsx` : application de `titleAlign` sur l'en-tête de section et les titres de cartes.
- `src/types/index.ts` : extension de `FooterConfig` (`columnCount`, `columnWidths`, `sectionOrder`) et des settings de blocs si typés.
- `src/pages/admin/AdminFooter.tsx` : DnD des colonnes (dnd-kit déjà utilisé ailleurs), contrôles nombre/largeur de colonnes, réordonnancement des blocs.
- `src/components/layout/Footer.tsx` : respect de `sectionOrder`, `columnCount`, `columnWidths`.
- `src/components/product/ProductStatusBadges.tsx` (+ `ProductCard.tsx`, `ProductHeaderBlock.tsx`) : rendu conditionné par un nouveau réglage `showProductStatusBadges` (défaut `false`) lu depuis `designSettings`, interrupteur dans `src/pages/admin/AdminProductBadges.tsx`.
