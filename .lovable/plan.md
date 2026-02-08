
# Ameliorations visuelles et UX

## 1. Suppression des overlays sur le Hero Slider

**Fichier :** `src/pages/Home.tsx` (lignes 201-202)

Les deux divs de gradient overlay seront supprimees :
- `bg-gradient-to-t from-background via-background/40 to-transparent`
- `bg-gradient-to-r from-background/60 to-transparent`

## 2. Adaptation mobile de la page produit

**Fichier :** `src/pages/ProductDetail.tsx`

- La grille `grid lg:grid-cols-2 gap-12` sera adaptee avec un `gap-6` sur mobile et des paddings reduits (`px-4 py-4` au lieu de `py-8`)
- Le bouton retour sera plus compact sur mobile

**Fichier :** `src/components/product/ProductInfo.tsx`

- Le titre passera de `text-4xl` a `text-2xl md:text-4xl`
- Le prix passera de `text-4xl` a `text-2xl md:text-4xl`
- La barre de reassurance (livraison, garantie, retours) sera `grid-cols-1 sm:grid-cols-3` au lieu de `grid-cols-3`

**Fichier :** `src/components/product/ProductOptions.tsx`

- Les boutons d'action (panier, coeur, partage) seront empiles sur mobile : `flex-col sm:flex-row`

## 3. Pastilles de couleurs au lieu de texte

**Fichier :** `src/components/product/ProductOptions.tsx`

Les boutons couleur qui affichent actuellement le nom de la couleur en texte seront remplaces par des pastilles rondes. Le composant utilisera `product.colorOptions` (qui contient `color` en hex et `label`) s'il est disponible, sinon utilisera `product.colors` avec une correspondance nom-couleur basique.

```text
Avant : [Bouton "Noir"] [Bouton "Bleu"] [Bouton "Rouge"]
Apres : [Cercle #000] [Cercle #00F] [Cercle #F00]
         (avec bordure de selection + tooltip label)
```

## 4. Option admin : couleurs ou images pour les variantes

**Fichier :** `src/types/index.ts`

Ajout d'un champ `colorDisplayMode: 'swatches' | 'images'` dans `DesignSettings`.

**Fichier :** `src/pages/admin/AdminDesign.tsx`

Ajout d'une nouvelle section dans l'onglet existant (ou nouveau sous-onglet) "Catalogue" avec un switch pour choisir entre "Pastilles de couleur" et "Images de variantes".

**Fichier :** `src/components/product/ProductOptions.tsx`

Le composant lira `designSettings.colorDisplayMode` via `useApp()` :
- Mode `swatches` : pastilles rondes colorees
- Mode `images` : miniatures des images de `colorOptions[].image`

## 5. Image de fond fixe pour la sidebar (pas de parallax) et pas d'overlay

**Fichier :** `src/components/layout/MainLayout.tsx` (lignes 271-289)

- Suppression du `transform: translateY(${scrollY * 0.15}px)` pour rendre l'image fixe (backgroundAttachment: fixed ou simplement retirer le parallax)
- Suppression du glass overlay `bg-white/20 backdrop-blur-sm` (ligne 288)

## 6. Animation de transition entre les pages (parallax slide)

**Fichier :** `src/App.tsx`

Ajout d'un composant `AnimatedRoutes` qui enveloppe les `Routes` avec `AnimatePresence` de framer-motion. Chaque page sera enveloppee dans un `motion.div` avec une animation de type parallax-slide :

```text
Page sortante : glisse vers le haut + opacity -> 0 (rapide)
Page entrante : glisse depuis le bas + opacity 0 -> 1 (avec un leger delai)
```

Cela s'appliquera a toutes les transitions de pages, y compris quand on clique sur "Homme", "Femme", "Enfant" dans les categories.

Le composant utilisera `useLocation()` comme cle pour `AnimatePresence`, ce qui declenchera l'animation a chaque changement de route.

```text
Transition:
  exit:   { opacity: 0, y: -60 }    duration: 0.3s
  enter:  { opacity: 0, y: 80 } -> { opacity: 1, y: 0 }   duration: 0.5s
```

## Details techniques - Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/Home.tsx` | Suppression des 2 divs overlay du hero |
| `src/pages/ProductDetail.tsx` | Classes responsive pour mobile |
| `src/components/product/ProductInfo.tsx` | Tailles texte responsive, grille features responsive |
| `src/components/product/ProductOptions.tsx` | Pastilles couleur + lecture designSettings.colorDisplayMode |
| `src/components/layout/MainLayout.tsx` | Image sidebar fixe, suppression overlay sidebar |
| `src/types/index.ts` | Ajout `colorDisplayMode` dans DesignSettings |
| `src/pages/admin/AdminDesign.tsx` | Section choix couleurs/images |
| `src/App.tsx` | AnimatePresence + transitions de pages |
| `src/data/initialData.ts` | Valeur par defaut `colorDisplayMode: 'swatches'` |
