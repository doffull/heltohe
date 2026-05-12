## Problème

Le composant `CategoriesMenu` a bien été créé, mais je l'ai ajouté à `src/components/layout/Header.tsx` — un composant qui **n'est importé nulle part** dans l'app. Le header visible sur la page d'accueil (et tout le site public) provient de `src/components/layout/MainLayout.tsx`, qui a sa propre barre avec logo, nav, recherche, panier et compte. C'est pour ça que rien n'a changé à l'écran.

## Plan

### 1. Intégrer `CategoriesMenu` dans `MainLayout.tsx`

Dans la barre d'actions du header (autour de la ligne 336, à côté de la recherche / panier / compte), insérer le bouton **CATÉGORIES** qui ouvre la modal déjà créée.

Position proposée : juste avant la recherche, pour que ce soit le premier élément de la zone droite — le plus visible.

### 2. Éviter les doublons

Le `MainLayout` actuel a déjà :
- une icône Panier avec badge
- une icône Compte (User)
- une recherche extensible

Donc dans le `CategoriesMenu`, on **désactive la nav rapide** (Favoris / Comparer / Panier / Compte) sur desktop pour ne pas dupliquer ce qui existe déjà dans le header — on garde seulement le **bouton Catégories + la modal** (recherche, grille de catégories, CTA).

Si vous préférez quand même afficher Favoris + Comparer (qui n'existent pas encore dans le header), je les ajoute en plus.

### 3. Nettoyer

- Supprimer l'import et l'usage ajoutés dans `src/components/layout/Header.tsx` (fichier mort, mais on évite la confusion).

### Fichiers modifiés

- `src/components/layout/MainLayout.tsx` — import + insertion du `<CategoriesMenu />` dans la barre d'actions
- `src/components/layout/CategoriesMenu.tsx` — option `compact` pour masquer la nav redondante sur desktop
- `src/components/layout/Header.tsx` — retrait du `CategoriesMenu` (fichier non utilisé)

### Question

Voulez-vous que j'ajoute aussi **Favoris** et **Comparer** dans le header (en plus du Panier/Compte déjà présents), ou seulement le bouton **CATÉGORIES** + sa modal ?
