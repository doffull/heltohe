# Un seul espace « Pages & Catégories » + grille produits maîtrisée

## 1. Fusion des deux espaces

Aujourd'hui il y a deux endroits : **Pages** (menu admin) et **Paramètres > Catégories**. Ils seront réunis en un seul écran : **Catalogue > Pages & Catégories** (`/admin/pages`).

- L'écran affiche une liste unique : chaque catégorie apparaît avec sa page (une seule ligne, un seul réglage), suivie des pages libres (À propos, etc.).
- Un seul formulaire d'édition par élément, avec des onglets : **Général** (nom, slug, parent, visibilité menu, sous-catégories incluses), **Image / Cadrage** (mode, point focal, zoom, fond — l'éditeur existant), **Contenu** (Page Builder), **SEO** (méta titre/description, aperçu Google).
- Créer une catégorie depuis cet écran crée sa page (déjà géré par la base) ; supprimer supprime les deux.
- L'onglet « Catégories » de Paramètres est retiré ; un renvoi discret y pointe vers le nouvel écran. L'ordre d'affichage (drag & drop) et le nombre de colonnes d'accueil restent, déplacés dans le nouvel écran.
- Aucune modification d'URL publique (`/boutique/:slug` conservé).

## 2. Grille produits des pages

Le bloc « Grille produits » du Page Builder impose un nombre de colonnes fixe, identique sur mobile et desktop, avec une carte maison différente du reste du site — d'où des vignettes minuscules et une typographie qui ne colle pas.

- Le bloc utilisera la **carte produit du site** (même image, même typographie, mêmes badges) : plus d'écart de police.
- Réglages du bloc : colonnes **desktop** (2, 3, 4, 5), colonnes **mobile** (1 ou 2), taille des cartes (compacte / normale / large), espacement, nombre max de produits, catégorie source.
- La grille devient responsive : la valeur mobile s'applique en dessous de 768px, la valeur desktop au-delà, sans casser les pages existantes (valeurs par défaut : 2 mobile / 3 desktop, taille normale).
- Aperçu immédiat dans le Page Builder avec le rendu final.

## Détails techniques

- `src/pages/admin/AdminPages.tsx` : refonte en écran unifié (liste catégories+pages, formulaire à onglets réutilisant `CategoryFormDialog`/`CategoryFramingEditor` et `PageBuilder`), intègre `AdminCategoryOrdering`.
- `src/pages/admin/AdminSettings.tsx` : suppression de l'onglet Catégories, remplacé par un lien vers `/admin/pages`.
- `src/pages/admin/Admin.tsx` : le lien de navigation devient « Pages & Catégories ».
- `src/components/page/PageRenderer.tsx` : `ProductsSection` réécrit sur `ProductCard` + classes Tailwind responsives (`grid-cols-{mobile} md:grid-cols-{desktop}`) via une table de classes statiques (pas de style inline dynamique).
- `src/components/admin/PageBuilder.tsx` : nouveaux contrôles `columnsMobile`, `cardSize`, `gap` pour le bloc produits (et le bloc catégories aligné sur la même logique responsive).
- Pas de migration base de données nécessaire : les réglages vivent dans le JSON `sections` des pages.

## Hors périmètre

- Pas de refonte du design des pages publiques ni des URLs.
- Pas de changement du système de templates de pages.
