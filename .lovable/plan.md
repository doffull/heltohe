## Objectif
Empêcher l'IA de proposer des attributs techniques contenant "canaux horizontaux" / "matelassage à canaux" lors de la génération automatique des attributs produit.

## Fichier concerné
- `supabase/functions/product-ai-helpers/index.ts`

## Modifications prévues
1. Dans le prompt `case "attributes"`, ajouter une instruction explicite :
   - Ne jamais proposer la clé/valeur "Matelassage" → "À canaux horizontaux" (ou similaire).
   - Ne pas inventer de terme "canaux" / "horizontal" / "channels" s'il n'est pas explicitement visible et pertinent sur la photo.
   - Privilégier des attributs factuels (coupe, fermeture, poches, finition, etc.).
2. Redéployer la Edge Function `product-ai-helpers`.

## Livrable
- Prompt mis à jour et fonction redéployée, sans impact sur les autres actions IA (description, matière, entretien, etc.).