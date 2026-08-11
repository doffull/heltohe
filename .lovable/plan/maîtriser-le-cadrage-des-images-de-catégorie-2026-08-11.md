# Maîtriser le cadrage des images de catégorie

## Le problème constaté

Dans Paramètres > Catégories, le sélecteur « Mode image » (Cover / Contain) est enregistré en base (`cover_mode`), mais **aucun affichage du site ne le lit** : la grille d'accueil et le bandeau de la page catégorie forcent tous les deux `object-cover`. D'où l'impression que le réglage ne fait rien et que l'image est toujours recadrée.

## Ce que je vais faire

### 1. Aperçu live dans le formulaire catégorie
Sous l'image uploadée, un aperçu qui reproduit exactement les proportions réelles du site, avec deux onglets :
- **Grille accueil** (carte verticale/horizontale)
- **Bandeau de page** (large, 420px de haut)

L'aperçu réagit instantanément aux réglages, dégradé et titre inclus, pour voir précisément ce qui sera coupé.

### 2. Contrôles de cadrage complets
- **Mode image** : Cover (remplir, recadré), Contain (image entière visible), Fill (étirée)
- **Point focal** : une grille 3×3 cliquable + réglage fin par curseurs X/Y — définit quelle partie reste visible en Cover
- **Zoom** : curseur 100–200 % pour resserrer sans changer d'image
- **Couleur de fond** : utilisée en mode Contain quand l'image ne remplit pas le cadre
- Un bouton « Réinitialiser le cadrage »

### 3. Application réelle sur le site
Le mode, le point focal et le zoom sont appliqués :
- dans la grille de catégories de l'accueil,
- dans le bandeau de la page catégorie.

## Détails techniques

- Migration : ajout sur `categories` de `cover_position` (texte, ex. `50% 50%`), `cover_zoom` (numérique, défaut 1) et `cover_bg` (texte, nullable). `cover_mode` existant est réutilisé et accepte `cover | contain | fill`.
- `useCategories.ts` : mapping des nouveaux champs dans `CategoryRecord` (aller/retour insert + update).
- Nouveau helper `src/lib/categoryImageStyle.ts` : renvoie les classes/`style` (objectFit, objectPosition, scale, background) à partir d'une catégorie — utilisé par le formulaire d'aperçu et par les deux rendus front, pour garantir un aperçu fidèle.
- `CategoryFormDialog.tsx` : nouveau bloc « Cadrage » + composant d'aperçu interne.
- `CategoryGrid.tsx` et `CategoryPageRouter.tsx` (`CategoryHeader`) : remplacement du `object-cover` figé par le helper.
- Valeurs par défaut inchangées (cover, centre, zoom 1) : aucune catégorie existante ne change d'apparence.
