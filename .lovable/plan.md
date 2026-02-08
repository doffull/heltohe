
# Ajout de vidéos dans la galerie produit

## Objectif
Permettre d'afficher des vidéos en plus des images dans la galerie de la page detail produit. Les vidéos seront stockees via une nouvelle colonne `video_url` sur la table `products`, et le composant `ProductImageGallery` sera mis a jour pour gerer les deux types de media.

## Etapes

### 1. Migration base de donnees
Ajouter une colonne `video_url` (TEXT, nullable) a la table `products` pour stocker l'URL d'une video externe (YouTube, Vimeo, ou lien MP4 direct).

```sql
ALTER TABLE public.products ADD COLUMN video_url TEXT DEFAULT NULL;
```

### 2. Mise a jour du type Product
Ajouter le champ `videoUrl?: string` dans l'interface `Product` de `src/types/index.ts`.

### 3. Mise a jour du hook useProducts
- Mapper `video_url` vers `videoUrl` dans `dbToAppProduct`
- Mapper `videoUrl` vers `video_url` dans `appToDbProduct`

### 4. Refonte du composant ProductImageGallery
Le composant recevra un nouveau prop `videoUrl?: string`. La galerie comportera :

- **Bande de vignettes** : l'image principale + une vignette video (avec icone Play superposee) si `videoUrl` est fourni
- **Zone principale** : affiche soit l'image (avec zoom existant), soit la video via un element `<video>` (pour MP4) ou un `<iframe>` (pour YouTube/Vimeo)
- **Icone Play** sur la vignette video pour distinguer visuellement les deux types de media
- **Animations framer-motion** : transition AnimatePresence entre image et video

### 5. Mise a jour de ProductDetail
Passer `product.videoUrl` au composant `ProductImageGallery`.

## Details techniques

- Detection automatique du type de lien video : si l'URL contient "youtube" ou "vimeo", affichage en iframe ; sinon, element `<video>` natif HTML5 avec controles
- La video se lance au clic sur sa vignette et se met en pause quand on revient a l'image
- Le zoom n'est actif que sur les images, pas sur la video
- Aucune video n'est stockee en base : seule l'URL est sauvegardee

## Fichiers modifies
- `supabase/migrations/` -- nouvelle migration SQL
- `src/types/index.ts` -- ajout champ videoUrl
- `src/hooks/useProducts.ts` -- mapping video_url
- `src/components/product/ProductImageGallery.tsx` -- refonte galerie image+video
- `src/pages/ProductDetail.tsx` -- passage du prop videoUrl
