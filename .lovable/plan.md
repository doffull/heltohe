

## Plan : Tags produits, Hero Slider ameliore, FileDropZone global et Video mobile

---

### 1. Systeme de tags/sections pour les produits

**Probleme actuel** : Les sections de la page d'accueil ("Meilleures Ventes", "Tendances", "Focus Style", "Promos") utilisent une logique codee en dur (premier 4 produits, filtre par stock > 10, filtre par categorie "Homme", filtre par salePrice). L'admin ne peut pas choisir quels produits apparaissent dans quelle section.

**Solution** : Ajouter une colonne `tags` (tableau de textes) a la table `products` dans la base de donnees, puis permettre a l'admin d'assigner des tags comme "top", "trending", "style", "promo", "new_arrival", "featured" a chaque produit.

#### Modifications :

- **Migration SQL** : Ajouter `tags text[] DEFAULT '{}'` a la table `products`
- **`src/types/index.ts`** : Ajouter `tags?: string[]` au type `Product`
- **`src/hooks/useProducts.ts`** : Mapper le champ `tags` dans `dbToAppProduct` et `appToDbProduct`
- **`src/components/admin/ProductForm.tsx`** : Ajouter une section "Sections page d'accueil" avec des boutons toggle pour chaque tag disponible :
  - Dernieres arrivees (`new_arrival`)
  - Nouveaute (`trending`)
  - Produit a la une (`featured`)
  - Meilleures ventes (`top`)
  - Focus Style (`style`)
  - Promo (`promo`)
- **`src/components/home/ProductSections.tsx`** : Remplacer la logique codee en dur par un filtre sur `tags` :
  - Section "top" : `products.filter(p => p.tags?.includes('top'))`
  - Section "trending" : `products.filter(p => p.tags?.includes('trending'))`
  - etc.
  - Fallback sur la logique actuelle si aucun produit n'a de tag pour garder la compatibilite

---

### 2. Hero Slider : corrections et options supplementaires

**Corrections** :
- L'upload "Image mobile" dans le HeroSliderTab accepte uniquement `['image']` alors que l'utilisateur veut aussi la video
- Le champ `mediaType` n'est pas mis a jour quand on uploade une video via FileDropZone (il reste sur 'image')

**Ameliorations** :
- Accepter `['image', 'video']` pour le champ mobile du Hero Slider
- Ajouter un champ `mobileMediaType` au type `HeroSlide` pour differencier image/video sur mobile
- Detection automatique du type de media (image vs video) a l'upload via l'extension du fichier
- Dans `HeroSlider.tsx`, utiliser `<video>` si le media mobile est une video

#### Fichiers modifies :
- **`src/types/index.ts`** : Ajouter `mobileMediaType?: 'image' | 'video'` a `HeroSlide`
- **`src/pages/admin/AdminDesign.tsx`** (HeroSliderTab) :
  - Changer `accept={['image']}` en `accept={['image', 'video']}` pour le champ mobile
  - Ajouter la detection auto du type lors de l'upload (si URL finit par .mp4/.webm -> video)
  - Idem pour le fond principal : detecter automatiquement le `mediaType`
- **`src/components/home/HeroSlider.tsx`** : Gerer `mobileMediaType === 'video'` pour afficher `<video>` sur mobile

---

### 3. FileDropZone sur tout le tableau de bord

**Probleme** : Certaines zones du formulaire produit et d'autres pages admin utilisent encore des champs `<Input>` URL au lieu du composant `FileDropZone` drag-and-drop.

**Solution** : Remplacer les champs URL restants par FileDropZone dans :

- **`src/components/admin/ProductForm.tsx`** : Les champs image et video utilisent deja FileDropZone, mais les URLs d'images dans les `colorOptions` sont encore des saisies manuelles. Ajouter un FileDropZone pour les images associees a chaque option couleur.
- **`src/pages/admin/AdminDesign.tsx`** : Les champs de la sidebar (image mannequin, mobile) utilisent deja FileDropZone. Verifier que tous les champs media sont couverts.

Les pages AdminProducts (import PDF), AdminMedia, AdminMarketing utilisent deja FileDropZone ou des zones de drop. Le principal manque est sur les images des variantes couleur du formulaire produit.

---

### 4. Video pour mobile Hero et Sidebar

**Probleme** : Les champs "Image mobile" du Hero Slider et de la Sidebar n'acceptent que les images.

**Solution** :

- **Hero Slider mobile** : Deja couvert dans la section 2 ci-dessus
- **Sidebar mobile** : Dans `AdminDesign.tsx` (SidebarTab), changer le FileDropZone "Image mobile" de `accept={['image']}` a `accept={['image', 'video']}`. Ajouter un champ `mobileSidebarMediaType` pour savoir si c'est une video.
- **`src/types/index.ts`** : Ajouter `mobileSidebarMediaType?: 'image' | 'video'` a `DesignSettings`
- **Front-end sidebar** : Dans le composant qui rend la sidebar (MainLayout), utiliser `<video>` si le media mobile est une video

---

### Resume des fichiers modifies

| Fichier | Modifications |
|---|---|
| Migration SQL | Ajout colonne `tags text[]` sur `products` |
| `src/types/index.ts` | `tags?: string[]` sur Product, `mobileMediaType` sur HeroSlide, `mobileSidebarMediaType` sur DesignSettings |
| `src/hooks/useProducts.ts` | Mapper `tags` dans dbToAppProduct/appToDbProduct |
| `src/components/admin/ProductForm.tsx` | Section toggles pour tags + FileDropZone pour images des variantes couleur |
| `src/components/home/ProductSections.tsx` | Filtrer par tags au lieu de la logique codee en dur |
| `src/pages/admin/AdminDesign.tsx` | Accept video pour mobile Hero + mobile Sidebar, detection auto du type media |
| `src/components/home/HeroSlider.tsx` | Gerer video mobile via mobileMediaType |
| `src/data/initialData.ts` | Valeurs par defaut pour les nouveaux champs |

