

## Plan : Tags produits, Hero Slider ameliore, FileDropZone global et Video mobile

---

### 1. Systeme de tags/sections pour les produits

Ajouter une colonne `tags` (tableau de textes) a la table `products`, puis permettre a l'admin d'assigner des tags a chaque produit pour controler dans quelles sections de la page d'accueil il apparait.

#### Modifications :

- **Migration SQL** : Ajouter `tags text[] DEFAULT '{}'` a la table `products`
- **`src/types/index.ts`** : Ajouter `tags?: string[]` au type `Product`
- **`src/hooks/useProducts.ts`** : Mapper le champ `tags` dans `dbToAppProduct` et `appToDbProduct`
- **`src/components/admin/ProductForm.tsx`** : Ajouter une section "Sections page d'accueil" avec des boutons toggle pour chaque tag : `new_arrival`, `trending`, `featured`, `top`, `style`, `promo`
- **`src/components/home/ProductSections.tsx`** : Remplacer la logique codee en dur par un filtre sur `tags`, avec fallback sur la logique actuelle

---

### 2. Hero Slider : corrections et video mobile

- Accepter `['image', 'video']` pour le champ mobile du Hero Slider
- Ajouter `mobileMediaType?: 'image' | 'video'` au type `HeroSlide`
- Detection automatique du type de media a l'upload via l'extension du fichier
- Dans `HeroSlider.tsx`, utiliser `<video>` si le media mobile est une video

#### Fichiers : `src/types/index.ts`, `src/pages/admin/AdminDesign.tsx`, `src/components/home/HeroSlider.tsx`

---

### 3. FileDropZone sur tout le tableau de bord

Remplacer les champs URL restants par FileDropZone, notamment les images des variantes couleur dans `ProductForm.tsx`.

---

### 4. Video pour Sidebar mobile

- Changer le FileDropZone "Image mobile" de la sidebar de `accept={['image']}` a `accept={['image', 'video']}`
- Ajouter `mobileSidebarMediaType?: 'image' | 'video'` a `DesignSettings`
- Rendre `<video>` dans le composant sidebar si le media mobile est une video

---

### Resume des fichiers modifies

| Fichier | Modifications |
|---|---|
| Migration SQL | Ajout colonne `tags text[]` sur `products` |
| `src/types/index.ts` | `tags` sur Product, `mobileMediaType` sur HeroSlide, `mobileSidebarMediaType` sur DesignSettings |
| `src/hooks/useProducts.ts` | Mapper `tags` |
| `src/components/admin/ProductForm.tsx` | Toggles pour tags + FileDropZone pour variantes couleur |
| `src/components/home/ProductSections.tsx` | Filtrer par tags |
| `src/pages/admin/AdminDesign.tsx` | Accept video pour mobile Hero + Sidebar, detection auto type |
| `src/components/home/HeroSlider.tsx` | Gerer video mobile |
| `src/data/initialData.ts` | Valeurs par defaut |

