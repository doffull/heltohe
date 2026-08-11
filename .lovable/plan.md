# Simplifier catégories = pages

## Principe
Une catégorie = une page. Tout se gère depuis **Catalogue > Catégories**. Créer une catégorie crée sa page automatiquement (et la garde synchronisée si on renomme). Assigner un produit à une catégorie le fait apparaître aussitôt sur la page de cette catégorie et sur celle de sa catégorie parente.

## 1. Création / renommage automatique de la page
- La page est créée à l'ajout d'une catégorie (déjà le cas) **et** synchronisée quand on renomme la catégorie ou change son slug : titre, slug et URL suivent la catégorie, le contenu déjà personnalisé reste intact.
- Suppression d'une catégorie : sa page est supprimée aussi.
- Slugs propres et sans caractères cassants (« veste & survét » devient « veste-survet »).

## 2. Édition depuis la catégorie
- Le formulaire catégorie gagne un onglet **Page** : publier / dépublier, SEO (repris de la catégorie), et bouton « Modifier le contenu » qui ouvre directement le Page Builder de cette catégorie.
- Bouton « Voir la page » (ouvre l'URL publique).
- L'écran **Pages** ne liste plus que les pages libres (À propos, etc.) ; les pages de catégorie sont accessibles depuis les catégories, avec un lien de renvoi si besoin.

## 3. Produits → catégorie, sans configuration
- Sur la page d'une catégorie parent, les produits des sous-catégories remontent (« survêtement » apparaît aussi dans « Homme »).
- Le rattachement produit ↔ catégorie devient insensible à la casse/accents et aux pluriels simples, pour éviter les « cagoule » / « cagoules » qui disparaissent.
- Dans « Modifier le produit », le sélecteur ne propose que des catégories existantes ; créer une nouvelle catégorie depuis ce sélecteur la crée réellement (avec sa page).
- Collab reste isolé de la boutique comme aujourd'hui.

## 4. Nettoyage des données existantes
- Fusion du doublon de page sur « Homme » (page parasite « veste »).
- Création de la page manquante pour « survêtement ».
- Correction du slug « veste & survét ».
- Création de la catégorie « Cagoule » (sous-catégorie de Homme) et rattachement des 4 produits « cagoule / cagoules ».

## Détails techniques
- Migration : réécriture de `auto_create_category_page` + nouveau trigger `AFTER UPDATE` de synchro titre/slug, trigger `AFTER DELETE` pour supprimer la page, normalisation des slugs dans `generate_category_slug` (suppression des `&`, espaces, caractères spéciaux). Index unique `pages(category_id)` après dédoublonnage.
- Script de données (outil d'insertion) : suppression de la page en trop, création de la page manquante, création de « Cagoule », `UPDATE products` pour normaliser `category`/`categories`.
- Front : nouvelle fonction `categoryWithDescendants(categories, title)` dans `src/lib/productCategories.ts` ; `Shop.tsx` filtre via cette liste (parent + enfants), matching normalisé (accents, casse, pluriel).
- `CategoryFormDialog.tsx` : onglet « Page » (publication, lien Page Builder, aperçu). `AdminPages.tsx` : filtre par défaut sur les pages libres + badge « gérée par la catégorie » avec lien.
- `useCategories.ts` : `useDeleteCategory` inchangé (la page suit via trigger) ; ajout d'un helper de création rapide utilisé par `ProductForm.tsx`.

## Hors périmètre
- Pas de changement de structure d'URL (`/boutique/:slug` conservé), pas de redirections 301 automatiques après renommage.
