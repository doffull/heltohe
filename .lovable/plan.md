## Problème

Dans `src/hooks/useProducts.ts`, `useUpdateProduct` appelle `appToDbProduct(product)` sur toutes les mutations, y compris les mises à jour partielles comme `updateProduct.mutateAsync({ id, price: n })` (édition inline du prix, SKU, catégorie, stock dans `AdminProducts.tsx`).

`appToDbProduct` construit **un enregistrement complet** avec des valeurs par défaut : `gallery_images: sanitizePersistableUrls(product.galleryImages)` → tableau vide, `image: '' `, `sizes: []`, `colors: []`, `color_options: []`, `tags: []`, `is_active: true`, etc. Résultat : dès qu'on modifie le prix inline, la galerie, l'image principale, les tailles, couleurs et tags sont **écrasés**.

## Correctif

Rendre la conversion strictement partielle : ne renvoyer que les colonnes correspondant aux champs présents dans l'entrée. Deux ajustements dans `src/hooks/useProducts.ts` :

1. Réécrire `appToDbProduct` pour qu'il utilise une table de correspondance clé App → clé DB + transformer, et n'inclue une colonne que si la clé existe (`in`) dans l'objet reçu. Ne plus forcer `is_active: true` (à gérer explicitement par le formulaire de création).
2. `useCreateProduct` : passer par un helper `appToDbProductFull` (ou compléter côté appelant) pour garantir les champs obligatoires (`image`, `sizes: []`, `colors: []`, `gallery_images: []`, `is_active: true`, etc.) uniquement à la création.

Après ce fix :
- L'édition inline (prix, SKU, catégorie, stock) n'envoie plus que la colonne modifiée → la galerie et les autres champs restent intacts.
- `ProductForm` (édition complète) continue de fonctionner : il fournit toujours l'objet complet, donc toutes les colonnes seront présentes dans le payload.

## Détails techniques

```ts
const FIELD_MAP: Record<string, (v: any) => any> = {
  name: v => v,
  subtitle: v => v || null,
  price: v => v,
  salePrice: v => v || null,           // → sale_price
  image: v => sanitizePersistableUrl(v) ?? '',
  category: v => v,
  stock: v => v,
  sku: v => v,
  description: v => v || null,
  material: v => v || null,
  careInstructions: v => v || null,    // → care_instructions
  sizes: v => v || [],
  colors: v => v || [],
  colorOptions: v => (v || []),        // → color_options
  attributes: v => (v || {}),
  videoUrl: v => sanitizePersistableUrl(v), // → video_url
  tags: v => v || [],
  promoEndsAt: v => v || null,
  modelHeight / modelSizeWorn / modelName,
  galleryImages: v => sanitizePersistableUrls(v), // → gallery_images
  templateId: v => v ?? null,
};
```

Construire l'objet en itérant uniquement sur `Object.keys(product)` présents. `useCreateProduct` remplit les champs manquants requis (`image: ''`, `sizes: []`, `gallery_images: []`, `is_active: true`, etc.) avant l'insert.

Aucun changement côté composants, aucune migration DB.