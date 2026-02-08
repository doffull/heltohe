
# Refonte de la Sidebar -- Style "Product Card HUD"

## Vue d'ensemble

Transformation complete de la sidebar gauche pour reproduire le design de l'image de reference : une sidebar centree sur le produit actif avec un affichage "fiche technique" immersif. Les fonctionnalites seront entierement configurables depuis l'onglet **Sidebar** de l'admin Design.

## Elements identifies dans l'image de reference

1. **En-tete** : Nom de marque (ex: "SPOPT") + mention "NEW EDITION" en haut a gauche
2. **Numero produit** : Badge "006" en haut a droite dans une forme biseautee
3. **Image mannequin** : Photo grand format en fond (deja existant)
4. **Carte produit** : Icone play + nom de marque, nom du produit, description technique
5. **Selecteurs de taille** : Badges "Size XS", "Size XL" dans des cadres bordes
6. **Galerie miniature** : Vignette du produit avec compteur d'images et label "Preview"
7. **Barre inferieure** : Zone rectangulaire en bas (barre de progression ou info)

## Modifications prevues

### 1. Sidebar - Nouvelle structure (`src/components/layout/MainLayout.tsx`)

Le contenu de la sidebar (lignes 289-325) sera restructure pour afficher :

**Zone haute :**
- Texte de marque configurable (ex: "SPOPT") + sous-titre (ex: "NEW EDITION")
- Badge numero de produit en haut a droite avec forme biseautee

**Zone centrale :**
- Carte d'information produit avec :
  - Icone play (triangle) + nom de marque
  - Nom du produit (titre principal)
  - Description courte / tagline technique
- Selecteurs de taille dynamiques bases sur le produit survole/selectionne
  - Affichage du format "Size XS", "Size XL" (taille min et max disponibles)

**Zone basse :**
- Mini galerie : vignette du produit avec compteur d'images et label "Preview"
- Barre de progression / info (reprend les stat bars existantes mais dans un format barre unique)

Quand aucun produit n'est survole, la sidebar affichera les donnees par defaut configurees dans l'admin.

### 2. Integration avec les donnees produit

La sidebar lira les donnees depuis `SidebarContext` (produit survole) et `AppContext` (produit selectionne). Les informations affichees seront :
- `product.name` pour le titre
- `product.subtitle` ou `product.description` pour la tagline
- `product.sizes` pour les selecteurs de taille
- `product.colorOptions` pour la galerie miniature
- `product.sku` pour le numero de produit
- `product.image` + `product.colorOptions[].image` pour la galerie avec compteur

### 3. Admin Design - Onglet Sidebar enrichi (`src/pages/admin/AdminDesign.tsx`)

Nouvelles options configurables dans la section Sidebar :

| Option | Type | Description |
|--------|------|-------------|
| Nom de marque sidebar | Texte | Ex: "SPOPT", "LVTK6" |
| Sous-titre sidebar | Texte | Ex: "NEW EDITION", "COLLECTION 2026" |
| Afficher numero produit | Switch | Badge SKU en haut a droite |
| Afficher selecteurs taille | Switch | Afficher/masquer les tailles |
| Afficher galerie miniature | Switch | Vignettes produit en bas |
| Afficher carte produit | Switch | Bloc info produit central |
| Afficher barres de stats | Switch | Conserver ou non les stat bars |
| Texte de la barre info | Texte | Texte personnalise pour la barre du bas |

### 4. Types (`src/types/index.ts`)

Ajout de champs dans `DesignSettings` :

```text
sidebarBrandName: string        // "SPOPT"
sidebarBrandSubtitle: string    // "NEW EDITION"
showSidebarProductNumber: boolean
showSidebarSizes: boolean
showSidebarGallery: boolean
showSidebarProductCard: boolean
showSidebarStats: boolean
sidebarInfoText: string
```

### 5. Valeurs par defaut (`src/data/initialData.ts`)

```text
sidebarBrandName: 'LVTK6'
sidebarBrandSubtitle: 'NEW EDITION'
showSidebarProductNumber: true
showSidebarSizes: true
showSidebarGallery: true
showSidebarProductCard: true
showSidebarStats: true
sidebarInfoText: ''
```

### 6. Styles CSS (`src/index.css`)

Ajout de styles pour :
- `.sidebar-product-card` : carte glassmorphism avec fond semi-transparent
- `.sidebar-product-number` : badge biseaute en haut a droite
- `.sidebar-gallery-thumb` : vignette avec bordure et compteur
- `.sidebar-size-badge` : selecteur de taille style "Size XS" avec bordure

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/layout/MainLayout.tsx` | Refonte complete du contenu sidebar (lignes 289-325) |
| `src/pages/admin/AdminDesign.tsx` | Ajout des nouvelles options dans l'onglet Sidebar |
| `src/types/index.ts` | Ajout des nouveaux champs DesignSettings |
| `src/data/initialData.ts` | Valeurs par defaut pour les nouveaux champs |
| `src/index.css` | Nouveaux styles pour les composants sidebar |

## Comportement dynamique

```text
Produit survole dans la boutique ?
  -> OUI : Afficher ses infos (nom, tailles, galerie, SKU)
  -> NON : Produit selectionne (fiche produit) ?
    -> OUI : Afficher ses infos
    -> NON : Afficher les donnees par defaut de l'admin
```

La galerie miniature affichera toutes les images disponibles du produit (image principale + colorOptions images). Un clic sur la miniature fera defiler les images avec un petit compteur "1/3", "2/3", etc. style "Preview".
