# Masquer complètement les produits Collab hors de la page /collab

## Constat

Le filtre marketplace (`excludeMarketplaceProducts`) est déjà appliqué dans les sections produits de l'accueil, le compte à rebours promo, le méga menu, la recherche et la boutique. Mais deux endroits laissent encore passer les articles Collab :

- `src/pages/Home.tsx` : `featuredProducts = products.slice(0, 4)` et `newArrivals = products.slice(4, 10)` utilisent la liste brute des produits (donc « Nouveautés » / mises en avant peuvent afficher du Collab).
- `src/components/home/CategoryGrid.tsx` : la grille de catégories liste toutes les catégories racines, donc la vignette « Collab » apparaît à côté de Homme / Femme / Sportwear / Enfants.

## Corrections

1. **Accueil** — filtrer la source des produits dans `Home.tsx` avec `excludeMarketplaceProducts` avant de construter les listes « mises en avant », « nouveautés » et « top ventes ».
2. **Grille de catégories** — exclure la catégorie marketplace via `isMarketplaceCategory` dans `CategoryGrid.tsx`, comme c'est déjà fait dans la boutique et le méga menu.
3. **Vérification** — passer en revue les autres blocs d'accueil (parallaxe promo, bannières, HUD latéral, assistant vocal) pour confirmer qu'aucun ne pioche dans la liste brute ; ajuster si un cas est trouvé.

La page `/collab` continue d'afficher ces produits normalement, ainsi que les produits liés / recommandations à l'intérieur d'une fiche Collab.

## Détails techniques

- Aucune modification de base de données ; uniquement du filtrage côté affichage via `src/lib/shopVisibility.ts`.
- Aucun changement du badge « LIMITED EDITION » ni du catalogue Collab.
