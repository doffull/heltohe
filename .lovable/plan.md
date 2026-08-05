# Réparer le rendu des pages lors de l'import PDF produits

## Problème confirmé

L'import de catalogue PDF s'appuie sur une librairie de rendu graphique native (`@napi-rs/canvas`) qui n'existe pas dans l'environnement d'exécution des fonctions serveur. Résultat : chaque tentative de transformation d'une page PDF en image échoue silencieusement (18 échecs relevés en quelques heures).

Conséquences actuelles :
- Pour un PDF « scanné » (peu de texte), l'import s'arrête immédiatement et renvoie 0 produit.
- Pour un PDF textuel, les produits sont bien extraits, mais aucune image de page n'est attachée.

## Ce qui sera fait

1. **Remplacer le moteur de rendu** par une version WebAssembly compatible avec l'environnement serveur (canvas Skia WASM), chargée une seule fois et mise en cache.
2. **Vérification au démarrage** : un test de rendu sur la page 1. Si le moteur WASM ne se charge pas, on n'essaie plus page après page (fin du spam d'erreurs).
3. **Repli fonctionnel** quand le rendu est indisponible :
   - PDF scanné : envoyer à l'IA les images déjà embarquées dans le PDF (extraction existante) au lieu des pages rendues, afin de continuer à produire des produits.
   - PDF textuel : conserver l'extraction texte + images embarquées, sans bloquer.
4. **Message clair renvoyé à l'interface** d'import lorsqu'aucune image n'a pu être produite, au lieu d'un résultat vide sans explication.

## Détails techniques

- `supabase/functions/parse-products-pdf/index.ts`
  - `renderCompressedPage` : injection d'un module canvas WASM (`deno.land/x/canvas`, adapté à l'interface attendue par `unpdf` : `createCanvas`, `loadImage`) via un loader mémoïsé.
  - Ajout d'un drapeau `rasterEnabled` évalué une fois ; les boucles pages (lignes ~362 et ~481) le respectent au lieu de retenter chaque page.
  - Mode scanné : si `rasterEnabled === false` mais que `collectEmbedded` a renvoyé des images, construire les lots multimodaux à partir de ces images (mêmes prompts, même déduplication).
  - La réponse inclut `rasterAvailable: boolean` et un message d'erreur explicite dans `errors[]`.
- Aucune modification de base de données, aucun changement d'interface admin autre que l'affichage du message d'erreur déjà géré par `importProductsFromPdf`.
