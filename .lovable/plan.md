

## Plan : Hero Slider mobile + Hotspots enrichis + Options d'affichage Hero

Ce plan couvre 4 axes majeurs demandes par l'utilisateur.

---

### 1. Hero Slider : options d'affichage image (object-fit)

**Probleme** : Les images du Hero Slider sont toujours en `object-cover`, sans possibilite de choisir le mode d'affichage.

**Solution** : Ajouter un champ `objectFit` par slide dans le type `HeroSlide` et dans l'admin.

- Ajouter `objectFit?: 'cover' | 'contain' | 'fill' | 'none'` et `objectPosition?: string` au type `HeroSlide` dans `src/types/index.ts`
- Dans `AdminDesign.tsx` (HeroSliderTab), ajouter un selecteur "Mode d'affichage" par slide avec les options : Cover, Contain, Remplir, Original
- Ajouter un champ "Position" (ex: `center`, `top`, `bottom`) pour affiner le cadrage
- Dans `HeroSlider.tsx`, appliquer dynamiquement `style={{ objectFit, objectPosition }}` sur le `<img>` et `<video>` du background

### 2. Hero Slider : image mobile distincte avec options

**Probleme** : Le champ `mobileImage` existe deja dans le type et dans l'admin, mais le `HeroSlider.tsx` ne l'utilise pas.

**Solution** :
- Dans `HeroSlider.tsx`, detecter `isMobile` via le hook existant et utiliser `currentSlide.mobileImage` quand disponible sur mobile
- Ajouter `mobileObjectFit?: string` et `mobileObjectPosition?: string` au type `HeroSlide`
- Dans l'admin, sous le champ "Image mobile", ajouter les memes options d'affichage (Cover/Contain/etc.) pour mobile

### 3. Hotspots : refonte complete de l'administration

**Probleme actuel** :
- Positionnement par saisie texte (ex: "50%") peu pratique, pas d'apercu
- Pas de media/produit associe au hotspot
- Les hotspots "desactives" restent visibles (le preset "Desactive" vide la liste au lieu de les masquer)
- Pas de choix de forme du marqueur

**Solutions** :

#### 3a. Apercu visuel interactif pour positionner les hotspots
- Dans `HotspotsTab`, ajouter un conteneur d'apercu affichant l'image sidebar avec les hotspots positionnes
- Chaque hotspot est un point draggable (via `onMouseDown/onMouseMove/onMouseUp`)
- Les coordonnees se mettent a jour en temps reel dans les champs X/Y
- Afficher les coordonnees a cote du point pendant le drag

#### 3b. Contenu interactif du popup (media + produit)
- Ajouter au type `MannequinHotspotConfig` :
  - `enabled?: boolean` (visible ou non)
  - `markerType?: 'dot' | 'cross' | 'diamond' | 'square' | 'ring'`
  - `productId?: string` (lier a un produit existant)
  - `productName?: string`, `productPrice?: number`, `productSalePrice?: number`, `productSizes?: string[]` (infos manuelles)
  - `contentMode?: 'manual' | 'product'` (choix entre saisie manuelle ou selection produit)
- Dans l'admin, pour chaque hotspot :
  - Toggle activer/desactiver
  - Selecteur de forme du marqueur (dot, croix, losange, carre, anneau)
  - Upload media (image/video) via FileDropZone
  - Choix du mode : "Manuel" ou "Produit existant"
    - Manuel : champs nom, prix, prix promo, tailles, image
    - Produit : dropdown de selection parmi les produits existants (via `useProducts`)

#### 3c. Activation/desactivation individuelle
- Ajouter `enabled` (defaut `true`) a chaque hotspot
- Dans `MannequinHotspot.tsx`, filtrer les hotspots avec `enabled !== false`
- Dans l'admin, toggle par hotspot + bouton supprimer

#### 3d. Formes de marqueur personnalisables
- Dans `MannequinHotspot.tsx`, selon `markerType`, rendre un SVG different (point, croix, losange, carre, anneau)
- Ajouter le CSS correspondant

### 4. Popup enrichi sur le front

- Dans `MannequinHotspot.tsx`, quand `contentMode === 'product'` et `productId` est defini, afficher dans le tooltip : image produit, nom, prix, prix promo, tailles
- Quand `contentMode === 'manual'`, afficher les champs manuels (comme actuellement + media)

---

### Fichiers modifies

| Fichier | Modifications |
|---|---|
| `src/types/index.ts` | Ajout champs `objectFit`, `objectPosition`, `mobileObjectFit`, `mobileObjectPosition` sur `HeroSlide`. Ajout `enabled`, `markerType`, `productId`, `productName`, `productPrice`, `productSalePrice`, `productSizes`, `contentMode` sur `MannequinHotspotConfig` |
| `src/components/home/HeroSlider.tsx` | Utiliser `mobileImage` sur mobile, appliquer `objectFit`/`objectPosition` dynamiques |
| `src/pages/admin/AdminDesign.tsx` | HeroSliderTab : selecteurs objectFit + mobile objectFit. HotspotsTab : apercu visuel draggable, toggle enabled, selecteur forme, upload media, mode manuel/produit avec selection produit |
| `src/components/layout/MannequinHotspot.tsx` | Filtrer hotspots `enabled !== false`, rendre formes differentes selon `markerType`, afficher infos produit dans le popup |
| `src/data/initialData.ts` | Valeurs par defaut pour les nouveaux champs |

---

### Details de l'apercu draggable (Hotspots)

```text
+-------------------------------+
|  Image sidebar (miniature)    |
|                               |
|     [o] Col technique         |
|           \                   |
|   [x] Poche  <-- draggable   |
|                               |
|        [◇] Tissu              |
|                               |
|     [□] Ourlet                |
+-------------------------------+
  Cliquez et glissez un point
  pour le repositionner
```

L'apercu utilisera l'image sidebar actuelle en fond, avec les hotspots positionnes en `position: absolute` selon leurs coordonnees %. Le drag mettra a jour X/Y en temps reel.

