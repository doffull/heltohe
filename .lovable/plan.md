# Plusieurs catégories par produit

## Objectif
Permettre d'affecter un produit à plusieurs catégories (ex. « Homme » + « Sportswear » + « Veste »), sans casser l'existant qui repose sur une catégorie unique.

## Principe retenu
- La catégorie actuelle reste la **catégorie principale** (fil d'Ariane, SEO, template de page, badges par catégorie, isolation Collab/marketplace).
- Ajout de **catégories secondaires** : le produit apparaît aussi dans ces rayons (boutique, filtres, méga menu, pages catégorie, sections d'accueil auto par catégorie).

## Interface admin (Modifier le produit)
- Le sélecteur de catégorie existant devient : une pastille « principale » (choix unique, comme aujourd'hui) + des pastilles multi-sélection pour les catégories additionnelles.
- Cliquer sur une catégorie additionnelle l'ajoute/la retire ; cliquer sur « définir comme principale » la promeut.
- Récapitulatif visible des catégories sélectionnées + auto-save comme le reste du formulaire.
- Édition en masse (BulkEditDialog) : possibilité d'ajouter ou retirer une catégorie additionnelle sur plusieurs produits d'un coup.

## Côté boutique
- Boutique et filtres : un produit remonte dès qu'une de ses catégories correspond.
- Pages catégorie et méga menu : idem, les produits multi-catégories apparaissent dans chaque rayon.
- Sections d'accueil automatiques par catégorie/tag : prise en compte de toutes les catégories.
- Collab / marketplace : reste isolé — si « Collab » figure dans les catégories, le produit reste réservé à son espace dédié et n'apparaît pas dans la boutique classique.
- Produits associés : score augmenté quand des catégories sont partagées.

## Détails techniques
- Migration : ajout d'une colonne `categories text[] NOT NULL DEFAULT '{}'` sur `products` (aucune suppression de `category`). Backfill : `categories = ARRAY[category]`.
- `useProducts.ts` : mapping `categories` dans `dbToAppProduct` et entrée `FIELD_MAP` (mise à jour partielle préservée), type `Product.categories?: string[]`.
- Helper central `productCategories(p)` (union de `category` + `categories`, dédupliqué, insensible à la casse) utilisé par `useShopProducts`, `ShopFilterPanel`, `CategoryPageRouter`, `MegaMenu`, `homeFeedSections`, `ProductFeedSection`, `RelatedProducts`, `shopVisibility`.
- `shopVisibility.ts` : `isMarketplaceCategory` évalué sur l'ensemble des catégories.
- Imports CSV/PDF/WooCommerce : conservent la 1re catégorie comme principale et versent les suivantes dans `categories`.

## Hors périmètre
- Pas de changement d'URL produit ni de nouvelle structure de navigation.
