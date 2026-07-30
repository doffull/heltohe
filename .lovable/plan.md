# Objectif

Les descriptions générées par l'IA doivent décrire **ce qui est réellement visible sur les photos** du produit, sans inventer de matières, coupes ou fonctionnalités.

## Constat actuel

- `product-ai-helpers` (action `description`) envoie **une seule image** (l'image principale) et un prompt très libre : « Décris ce produit en 3-5 phrases… Mets en avant matières, coupe, usage » → l'IA extrapole (imperméabilité, technologies, usages) sans vérification visuelle.
- Le modèle utilisé est `openai/gpt-5-mini` pour tous les cas, y compris les appels vision.
- `generate-product-description` (utilisé dans le dialogue d'inventaire) ne reçoit **aucune image** du tout : description 100 % inventée à partir du nom.

## Changements prévus

### 1. Envoyer toutes les photos utiles
- Côté `ProductForm` (et boutons IA associés) : transmettre `imageUrls` = image principale + jusqu'à 3 images de galerie + éventuelles images de variantes, au lieu du seul `imageUrl`.
- Côté edge function : accepter `imageUrls[]` (rétro-compatible avec `imageUrl`) et construire un message multimodal avec plusieurs blocs `image_url`.

### 2. Prompt anti-hallucination en 2 temps
- Étape A (observation) : l'IA liste d'abord, via l'outil structuré, ce qu'elle **voit** (type de vêtement, couleur dominante, matière apparente, détails : capuche, zips, poches, coutures, logo, coupe, longueur).
- Étape B (rédaction) : la description est rédigée **uniquement** à partir de ces observations + des données saisies (nom, catégorie, matière, couleurs, tailles).
- Règles injectées dans le system prompt : interdiction d'inventer des performances techniques (imperméabilité, indices, températures) non visibles ou non fournies ; pas de marque/collab non affichée ; ton éditorial mais factuel ; 3-5 phrases, ≤ 600 caractères, français.

### 3. Modèle vision plus fiable
- Utiliser `google/gemini-2.5-pro` pour les actions multimodales (`description`, `material`, `attributes`) et garder un modèle rapide pour le texte pur (`subtitle`, `color-name`).
- Même durcissement pour `material` (répondre « Non identifiable » plutôt que deviner) et `attributes` (uniquement des attributs déductibles de l'image ou des données saisies).

### 4. Retour visible dans l'admin
- Renvoyer aussi la liste des observations et l'afficher en petit sous le champ description (« Basé sur : capuche amovible, zip double curseur, tissu matelassé… ») pour que vous voyiez sur quoi l'IA s'est appuyée.
- Si aucune image n'est disponible : message clair « Ajoutez au moins une photo pour une description fidèle » et génération dégradée signalée.

### 5. Harmonisation
- `generate-product-description` (dialogue inventaire) sera redirigé vers `product-ai-helpers` avec les images, pour un comportement identique partout.

## Détails techniques

- Fichiers : `supabase/functions/product-ai-helpers/index.ts`, `supabase/functions/_shared/gemini.ts` (aucun changement nécessaire, il accepte déjà les blocs image), `src/components/admin/ProductForm.tsx`, `src/components/admin/AiAttributesButton.tsx`, `src/components/admin/InventoryProductDialog.tsx`.
- Le schéma de l'outil reste simple (`{ observations: string[], value: string }`) sans bornes de longueur, les limites étant énoncées dans le prompt et coupées côté code.
- Les URLs d'images envoyées doivent être des URLs publiques persistantes (déjà garanti par `sanitizePersistableUrl`).
