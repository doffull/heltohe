## Objectif

3 changements ciblés sur la fiche produit :

1. **Galerie multi-images** par produit (au lieu d'une seule image)
2. **Mobile : remonter** le bloc Tailles + bouton « Ajouter au panier » au-dessus de la description
3. **Supprimer** le lien « Guide des tailles → » (le bouton « Trouver ma taille » suffit)

---

## 1. Galerie multi-images

### Base de données
Migration : ajouter `gallery_images TEXT[] DEFAULT '{}'` sur `products` (l'image principale `image` reste le « cover » utilisé partout — listings, panier, etc.).

### Types & hook
- `src/types/index.ts` : ajouter `galleryImages?: string[]` sur `Product`.
- `src/hooks/useProducts.ts` : mapper `gallery_images` ↔ `galleryImages` dans `dbToAppProduct` / `appToDbProduct`.

### Admin — ProductForm.tsx
Sous le champ « Image du produit », nouvelle section **« Galerie d'images supplémentaires »** :
- Liste réordonnable des images (drag pour réordonner, bouton X pour supprimer).
- Bouton « + Ajouter une image » qui ouvre une `FileDropZone` (multi-upload accepté).
- Limite raisonnable (ex. 10 images).

### Affichage — ProductImageGallery.tsx
- Construire `mediaList` = `[image cover, ...galleryImages]` dédupliqué.
- État `activeIndex` au lieu de `activeMedia: 'image' | 'video'` seulement → étendu à `'image-N' | 'video'`.
- **Bande de miniatures** (déjà présente) : afficher une vignette par image de la galerie quand pas de `colorOptions`. Quand `colorOptions` est utilisé, ses swatches restent prioritaires (comportement actuel inchangé) **et** les images de galerie apparaissent en miniatures additionnelles.
- Swipe gauche/droite mobile + flèches desktop pour naviguer entre images.
- L'image affichée (`displayImage`) prend en compte `activeIndex` quand aucun `colorOption.image` n'est actif.

---

## 2. UX Mobile — réordonner les blocs

`src/pages/ProductDetail.tsx` colonne droite actuelle :
```
ProductInfo (titre/prix/description)
ProductOptions (tailles, couleurs, qty, CTA)
```

Nouvel ordre **mobile uniquement** (desktop inchangé) en utilisant `order-*` Tailwind :
```
ProductInfo > en-tête (titre, prix, badges)   order-1
ProductOptions (tailles + couleurs + CTA)     order-2  ← remonté
ProductInfo > description / matière / care    order-3
```

Implémentation : scinder `ProductInfo` en deux sous-blocs (`<ProductInfoHeader />` et `<ProductInfoDetails />`) **ou** ajouter une prop `splitForMobile` qui rend deux fragments. Le wrapper dans `ProductDetail.tsx` devient `flex flex-col` avec classes `order-` responsives, puis revient en `lg:block` sur desktop pour préserver l'ordre actuel.

---

## 3. Retirer le lien « Guide des tailles »

`src/components/product/ProductOptions.tsx` lignes 86-99 :
- Supprimer le bouton `Guide des tailles →` et l'état `sizeGuideOpen` + `<SizeGuideModal />`.
- Retirer l'import `SizeGuideModal` et `useState`.
- Le bouton « Trouver ma taille » (AI — `SizeGuideAIModal`, géré ailleurs) reste seul.

---

## Détails techniques

| Fichier | Changement |
|---|---|
| migration SQL | `ALTER TABLE products ADD COLUMN gallery_images TEXT[] DEFAULT '{}'` |
| `src/types/index.ts` | + `galleryImages?: string[]` |
| `src/hooks/useProducts.ts` | mapping `gallery_images` |
| `src/components/admin/ProductForm.tsx` | nouvelle section galerie + state `galleryImages` |
| `src/components/product/ProductImageGallery.tsx` | support n images, navigation, miniatures |
| `src/components/product/ProductInfo.tsx` | split header/details (ou prop) |
| `src/pages/ProductDetail.tsx` | `order-*` responsive pour mobile |
| `src/components/product/ProductOptions.tsx` | retrait du lien + modal Guide des tailles |

## Hors périmètre

- Pas de changement aux listings produits (cover seul utilisé).
- Pas de changement aux `colorOptions` (continuent de gérer 1 image par couleur).
- Pas de zoom/lightbox repensé — on garde le double-tap fullscreen et le zoom 3.5x existants.
