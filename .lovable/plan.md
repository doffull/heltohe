# Grille produit vérifiée + Admin réellement utilisable sur mobile

## Résultat des tests (360 px et 820 px)

Grille boutique — conforme :
- Mobile 360 px : 2 colonnes, cartes de 156 × 413 px, gouttière 24 px, marges latérales 16 px, aucun débordement horizontal (scrollWidth = clientWidth = 360).
- Tablette 820 px : grille pleine largeur, pas de débordement.
- Aucune correction nécessaire côté grille produit.

Admin sur mobile — cassé, confirmé par la mesure :
- Sur `/admin/products` en 360 px, la page mesure 946 px de contenu pour 360 px d'écran, et le débordement est **coupé** (`overflow-x: hidden` global sur `body`). D'où l'impossibilité d'aller à droite/gauche : le contenu existe mais n'est ni visible ni scrollable.
- Cause : le conteneur `<main>` du layout admin n'a pas de `min-w-0`, donc les tableaux larges (`min-w-[820px]`) élargissent tout le layout au lieu de scroller dans leur propre zone.
- Barre d'outils, rangée d'onglets et boutons d'action dépassent aussi hors écran.
- Le même motif `min-w-[...]` est présent dans 16 écrans admin (Commandes, Stock, Clients, Colissimo, Pages, Design, Badges, Préparations, Messagerie, Marketing, SEO, Templates, logs WooCommerce, ProductForm…), donc le problème est global, pas propre aux produits.

## Ce que je vais corriger

1. Layout admin (correction de fond, profite à tous les écrans)
   - `min-w-0` + confinement du débordement sur le `<main>` admin, pour que les zones larges scrollent à l'intérieur au lieu de pousser la page.
   - Contenu admin en padding mobile-first, largeur maîtrisée, en-tête mobile déjà sticky conservé.

2. Tableaux admin : scroll horizontal réel
   - Chaque tableau large devient une zone de défilement horizontale propre (avec inertie tactile et indicateur d'ombre de bord), au lieu de déborder du layout.
   - Colonne « Produit » figée à gauche sur les grands tableaux pour garder le repère en scrollant.

3. Écran Produits en mode « liste de cartes » sur mobile
   - En dessous de 768 px, le tableau produits est remplacé par des cartes empilées : miniature, nom, SKU, prix, stock, badges, case de sélection et menu d'actions — sans aucun scroll horizontal.
   - Le tableau reste inchangé sur tablette large et desktop.

4. Barres d'outils, onglets et actions
   - Rangées d'onglets et de boutons d'actions rendues défilables horizontalement sans couper le contenu.
   - Recherche et filtres en pleine largeur empilés sur mobile.
   - Barre d'actions de masse (sélection multiple) collée en bas de l'écran sur mobile, cibles tactiles ≥ 44 px.

5. Généralisation à tout le tableau de bord admin
   - Les mêmes primitives (zone de tableau défilable, rangée d'onglets défilable, barre d'actions mobile) sont appliquées aux autres écrans admin listés ci-dessus, pour un comportement identique partout.

6. Vérification
   - Re-test automatisé en 360 px et 820 px sur les principaux écrans admin : aucun débordement coupé, scroll interne fonctionnel, captures avant/après.

## Détails techniques

- `src/pages/admin/Admin.tsx` : `min-w-0` et gestion du débordement sur `<main>`.
- Nouveaux utilitaires : composant de zone défilable pour tableaux + classes CSS dédiées dans `src/index.css` (`-webkit-overflow-scrolling: touch`, `overscroll-behavior-x: contain`, ombres de bord), sans toucher aux règles globales `body`.
- `src/pages/admin/AdminProducts.tsx` : rendu conditionnel via `useIsMobile()` pour la vue cartes ; logique de données, filtres, sélection et mutations inchangées.
- Autres écrans admin : remplacement des `min-w-[...]` nus par la zone défilable, sans changement de logique métier.
- Aucun changement de schéma base de données ni d'API.
