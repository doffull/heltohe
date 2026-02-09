

# Corrections : Hero Parallax, Categories, Boutons Sidebar, Menu Header

## Problemes identifies

### 1. Hero Parallax -- Image 2 transparente
Dans `src/pages/Home.tsx` (lignes 171 et 181), l'opacite des images est liee a `designSettings.sliderImageOpacity`. Si cette valeur a ete modifiee dans l'admin (ou si elle est stockee dans localStorage avec une valeur differente de 1), toutes les slides sont affectees. De plus, la couche "midground" (ligne 189) a un `opacity-60` en dur qui reduit la visibilite. **Solution** : forcer `opacity: 1` sur toutes les couches principales (background), et s'assurer que la valeur par defaut est toujours 1. Supprimer le `opacity-60` sur le midground layer ou le rendre configurable.

### 2. Vignettes de categories non synchronisees avec l'admin
Dans `src/pages/Home.tsx` (lignes 35-40), les categories sont codees en dur avec une constante `CATEGORIES` qui utilise des imports d'images locales (`catHomme`, `catFemme`, etc.). Ces images ne lisent PAS `designSettings.categories`. **Solution** : remplacer la constante `CATEGORIES` par les donnees de `designSettings.categories` pour que les modifications faites dans l'admin soient refletees sur la page d'accueil. Ajouter aussi "Accessoires" dans les categories admin par defaut.

### 3. Boutons hotspot de la sidebar non configurables
Les hotspots du mannequin dans `src/components/layout/MannequinHotspot.tsx` (lignes 13-46) sont codes en dur ("COL TECHNIQUE", "POCHE TACTIQUE", etc.) et ne sont pas geres dans l'admin. **Solution** : ajouter un type `MannequinHotspot` dans les types, un champ `mannequinHotspots` dans `DesignSettings`, et une section dans l'admin pour les configurer (label, details, position X/Y, icone).

### 4. Menu header -- Ajouter les categories et corriger le positionnement
Dans `src/components/layout/MainLayout.tsx` (lignes 30-37), le menu `NAV_ITEMS` ne contient pas les categories (Homme, Femme, Enfant). **Solution** : ajouter les liens de categories dans le menu de navigation. Les liens pointeront vers `/boutique?category=Homme`, etc. Le positionnement du menu sera verifie pour rester centre dans la zone blanche du header.

## Modifications par fichier

### `src/types/index.ts`
- Ajouter un type `MannequinHotspotConfig` avec `id`, `x`, `y`, `label`, `details`, `icon`
- Ajouter `mannequinHotspots: MannequinHotspotConfig[]` dans `DesignSettings`

### `src/data/initialData.ts`
- Ajouter les valeurs par defaut pour `mannequinHotspots` (les 4 hotspots actuels)
- Ajouter "Accessoires" dans les categories par defaut
- S'assurer que `sliderImageOpacity` est bien a `1`

### `src/pages/Home.tsx`
- **Categories** : Remplacer la constante `CATEGORIES` codee en dur par `designSettings.categories`, avec un fallback sur les images locales si aucune image admin n'est configuree
- **Hero opacity** : Forcer `opacity: 1` sur les couches background au lieu d'utiliser `sliderImageOpacity`, ou bien s'assurer que cette valeur est toujours 1 par defaut. Retirer le `opacity-60` du midground layer

### `src/components/layout/MannequinHotspot.tsx`
- Lire les hotspots depuis `designSettings.mannequinHotspots` au lieu de la constante codee en dur
- Conserver un fallback sur les valeurs par defaut si aucun hotspot n'est configure

### `src/components/layout/MainLayout.tsx`
- Ajouter les categories au menu `NAV_ITEMS` : Homme (`/boutique?category=Homme`), Femme (`/boutique?category=Femme`), Enfant (`/boutique?category=Enfant`)
- Verifier le centrage du menu dans le header

### `src/pages/admin/AdminDesign.tsx`
- Ajouter un onglet ou une section "Categories" pour gerer les vignettes de categories (titre + image uploadable)
- Ajouter une section "Hotspots du mannequin" dans l'onglet Sidebar pour configurer chaque hotspot (label, details, position X%, Y%)

## Comportement attendu

- Toutes les images du hero parallax s'affichent a 100% d'opacite
- Les vignettes de categories se mettent a jour automatiquement quand on les change dans l'admin
- Les hotspots de la sidebar sont entierement configurables depuis l'admin (ajout, suppression, modification de position et texte)
- Le menu header inclut les categories Homme, Femme, Enfant avec navigation vers la boutique filtree
- Le scroll-to-top (deja implemente) garantit l'arrivee en haut de page

