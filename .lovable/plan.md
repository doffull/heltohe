## Objectif

Lors de l'import PDF produits (`/admin/produits` → Importer PDF), extraire aussi les **images** de chaque page (jusqu'à 5 par produit) et les rattacher automatiquement au produit créé : la 1ʳᵉ comme image principale, les suivantes dans la galerie. Aujourd'hui les produits sont créés avec `/placeholder.svg`.

## Ce qui change

### 1. Edge Function `parse-products-pdf`

Actuellement elle rasterise déjà chaque page en JPEG (mode `raster-compressed`) pour envoyer au modèle. On enrichit la réponse :

- Pour chaque page rasterisée on **conserve le JPEG** (déjà produit) au lieu de le jeter.
- On demande au modèle, dans le prompt système, d'inclure pour chaque produit détecté le **numéro de page source** (`_pageIndex`) où il apparaît, en plus des champs actuels.
- On upload chaque JPEG de page dans le bucket Storage `media` (déjà utilisé partout ailleurs) sous `pdf-import/<timestamp>/page-<n>.jpg`, service-role.
- Réponse enrichie : chaque produit reçoit un champ `pageImages: string[]` = les URLs publiques des pages où il apparaît (déduit du `_pageIndex` — un produit peut apparaître sur 1 à N pages consécutives, on regroupe et on garde max 5 URLs).
- Pour le mode texte (PDF vectoriel sans rastérisation), on rasterise quand même les pages en arrière-plan pour disposer d'images de secours, avec le même mapping page → produit basé sur `_pageIndex` retourné par le modèle.

Le mode "multimodal fallback" (envoi du PDF brut) reste sans images — cas rare, on garde le placeholder.

### 2. Client `src/lib/productPdfImport.ts`

- Propage le nouveau champ `pageImages` dans `ParsedCatalogProduct`.
- Lors du merge des lots (dédup par SKU), fusionne les `pageImages` des lots (union, max 5).

### 3. UI `AdminProducts.tsx` — aperçu et import

- Dans le tableau d'aperçu des produits extraits, afficher une miniature (première `pageImages[0]`) et un compteur "N images".
- Dans `handleImportSelected`, remplacer `image: '/placeholder.svg'` par :
  - `image: p.pageImages?.[0] || '/placeholder.svg'`
  - `galleryImages: p.pageImages?.slice(1, 5) || []`

### 4. Découpage local `productPdfImport.ts`

Chaque lot PDF est déjà découpé côté client (4 pages max). Le mapping `_pageIndex` sera **relatif au lot** côté Edge Function ; on convertit en URL absolue de page (l'upload donne une URL publique unique par page) donc pas de collision entre lots.

## Détails techniques

- Bucket : `media` (public, déjà utilisé — voir `BulkProductImagesDialog`, `InventoryProductDialog`).
- Chemin : `pdf-import/<isoDate>/<batchId>/page-<n>.jpg`.
- Taille : JPEG déjà compressé (~1100px, qualité 65, quelques centaines de Ko/page).
- Cap : max 5 URLs par produit dans `pageImages` (1 image principale + 4 galerie).
- Fallback : si upload storage échoue, on continue sans images (log warning), le produit sera importé avec placeholder.
- Sécurité : upload via service-role dans l'Edge Function (déjà admin-gated).

## Hors périmètre

- Extraction fine des images individuelles **intégrées** dans le PDF (via parsing XObject) — trop fragile, on garde la stratégie "1 image = 1 page rendue", qui donne un rendu propre et cohérent des maquettes.
- Détecter automatiquement les visuels multiples d'un même produit sur une même page (crop) — pas demandé.
- Modification du mode CSV/Excel (pas d'images à extraire).

## Fichiers touchés

- **Modifié** `supabase/functions/parse-products-pdf/index.ts` : conserve les JPEGs, upload storage, mapping `_pageIndex → pageImages[]`, prompt système enrichi.
- **Modifié** `src/lib/productPdfImport.ts` : propage/fusionne `pageImages`.
- **Modifié** `src/pages/admin/AdminProducts.tsx` : miniature dans l'aperçu, affectation `image` + `galleryImages` à l'import.
