# Extraction des vraies images du PDF (ghost + image principale)

## Situation actuelle (vérifiée)

L'import PDF (`supabase/functions/parse-products-pdf/index.ts`) ne récupère aujourd'hui que des **captures de page entière** : chaque page est rasterisée en JPEG (1100 px max, qualité 65), envoyée au stockage, puis rattachée au produit via `pageImages`. À l'import (`AdminProducts.tsx`), `pageImages[0]` devient l'image principale et le reste la galerie — donc l'image principale est en réalité une page de catalogue complète, avec texte, prix et fond de page.

Aucune extraction des images **embarquées** dans le PDF n'existe.

## Objectif

Récupérer les visuels réels intégrés dans le PDF, les séparer en deux familles et les rattacher au bon produit :

- **Image principale** : le visuel porté / lifestyle (mannequin, mise en scène).
- **Ghost** : le packshot du vêtement seul sur fond blanc (ghost mannequin), utilisé en galerie.

## Ce qui sera construit

### 1. Extraction des images embarquées (Edge Function)

- Pour chaque page, parcourir la liste d'opérateurs PDF (via le proxy pdf.js déjà fourni par `unpdf`) et récupérer chaque objet image réellement présent dans la page (bitmaps RGB/RGBA/gris).
- Reconvertir chaque bitmap en JPEG via `imagescript` (déjà utilisé), redimensionné à 1400 px max.
- Filtrer le bruit : ignorer les images de moins de 200 px de côté, les bandeaux (ratio extrême), les logos répétés (même empreinte de taille/dimension apparaissant sur la majorité des pages).
- Dédupliquer par empreinte simple (dimensions + taille d'octets) pour ne pas réimporter 10 fois le même visuel.

### 2. Classification ghost / porté

Pour chaque image conservée d'une page :

- Mesure de la proportion de pixels quasi-blancs en bordure + saturation moyenne (calcul local, sans IA) : un packshot détouré est très majoritairement blanc sur les bords.
- Score combiné → étiquette `ghost` ou `worn`.
- En cas d'ambiguïté sur une page, l'appel IA déjà effectué pour cette page renvoie en plus, par produit, quelle image est le visuel porté (index d'image de la page), ce qui tranche les cas limites.

### 3. Rattachement au produit

Chaque produit extrait reçoit désormais :

- `mainImage` : le visuel porté de sa/ses page(s) (repli : premier ghost, puis capture de page).
- `ghostImages` : les packshots de la même page.
- `pageImages` : conservé tel quel en dernier recours (compatibilité et repli si aucune image embarquée n'est exploitable).

### 4. Interface d'import (admin Produits)

- La vignette de prévisualisation affiche l'image principale détectée, avec un liseré indiquant sa provenance (« porté », « ghost » ou « page »).
- Sous chaque ligne, une petite bande de miniatures des images trouvées ; un clic sur une miniature la promeut en image principale.
- Compteur explicite : « 1 principale · 3 ghost ».
- À l'import : `image` = image principale choisie, `galleryImages` = ghosts puis autres visuels (max 5).

## Détails techniques

- Fichiers touchés : `supabase/functions/parse-products-pdf/index.ts` (extraction, classification, upload), `src/lib/productPdfImport.ts` (fusion des nouveaux champs entre lots), `src/pages/admin/AdminProducts.tsx` (aperçu + choix de l'image principale), et `src/pages/admin/AdminStock.tsx` reste inchangé (il n'utilise pas les images).
- Stockage : les visuels partent dans le bucket `media`, sous `pdf-import/<date>/<lot>/p<page>-<n>-<ghost|worn>.jpg` (les captures de page restent où elles sont).
- Garde-fous mémoire : traitement page par page, libération des bitmaps après encodage, plafond d'images extraites par page (6) et par produit (5), plafond de pages inchangé (15 par lot).
- Repli complet : si l'extraction d'images embarquées échoue (PDF vectorisé, images en CMJN non décodables), le comportement actuel par captures de page reste actif — l'import ne casse jamais.
