# Sous-catégories optionnelles + bouton Collab dans le menu

## 1. Choix « afficher aussi les produits des sous-catégories »

Chaque catégorie gagne une option (activée par défaut, comportement actuel conservé) :

- **Activée** : la page de la catégorie affiche ses produits + ceux de toutes ses sous-catégories (ex. « Homme » montre « Survêtement », « Cagoule »…).
- **Désactivée** : la page n'affiche que les produits rattachés directement à cette catégorie.

Le réglage se trouve dans le formulaire de catégorie (Catalogue > Catégories), à côté des réglages d'affichage, avec une explication courte.

Mise à jour automatique : dès que l'option change, la page de la catégorie, la grille boutique, les compteurs de produits (nombre affiché en tête de page, compteurs de sous-catégories et compteurs des filtres taille/couleur) se recalculent depuis la même source, donc plus de chiffre incohérent.

## 2. Bouton logo « Collab » dans le menu camembert

- Ajout, dans le méga menu uniquement, d'un bouton cliquable affichant le logo Helvetica Mountain Pioneers × PEGASHOES.
- Clic → navigation vers l'espace `/collab`, et fermeture du menu.
- Placé de façon visible dans le panneau du menu (bloc dédié sous la liste des catégories), avec un léger effet au survol dans le style industriel du site.
- Ce bouton n'apparaît nulle part ailleurs (ni header, ni sidebar, ni footer), et Collab reste exclu des catégories normales du menu.

## Détails techniques

- Migration : `ALTER TABLE public.categories ADD COLUMN include_children boolean NOT NULL DEFAULT true;` (aucune donnée existante modifiée dans son comportement).
- `src/hooks/useCategories.ts` : champ `includeChildren` dans `CategoryRecord`, mapping `dbToCat`, et payloads create/update.
- `src/lib/productCategories.ts` : `categoryWithDescendants` accepte un mode « self only » (ou nouvelle fonction `categoryScopeFor(categories, title)` qui lit `includeChildren` et renvoie soit la catégorie seule, soit la catégorie + descendants).
- `src/pages/Shop.tsx` : `categoryScope` utilise ce nouveau helper ; `baseFiltered` et `baseFilteredForOptions` s'appuient dessus (donc compteurs de filtres alignés). `src/pages/CategoryPageRouter.tsx` : compteur d'en-tête basé sur le même scope.
- `src/components/admin/CategoryFormDialog.tsx` : Switch « Inclure les produits des sous-catégories ».
- Logo : enregistré comme asset CDN (`lovable-assets create` depuis l'image fournie) puis importé dans `src/components/layout/MegaMenu.tsx` ; nouveau bloc `Link to="/collab"` avec `onClick={close}` et `alt` descriptif.

## Hors périmètre

- Pas de changement d'URL ni de redirections.
- Pas de modification des règles d'isolation marketplace Collab.
