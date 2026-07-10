## Objectif

Extraire des produits depuis des PDF (maquettes / catalogues) de manière fiable pour importer des centaines de produits, sans dépendre de la clé Gemini directe (qui plante avec les gros fichiers et les modèles obsolètes).

## Diagnostic actuel

Aujourd'hui `parse-products-pdf` :
- envoie tout le PDF en base64 au shim `callGemini` (API Google directe via `GEMINI_API_KEY`),
- plafonne à ~18 Mo,
- traite tout le PDF d'un coup → timeout / 400 / 404 dès qu'un catalogue est un peu gros ou que le modèle change.

C'est fragile et cher en tokens.

## Solution proposée (3 couches)

### 1. Basculer vers Lovable AI Gateway (plus de clé Gemini à gérer)

- Remplacer `callGeminiText` / `callGemini` par un appel direct à `https://ai.gateway.lovable.dev/v1/chat/completions` avec le header `Lovable-API-Key: ${LOVABLE_API_KEY}` (déjà présent dans les secrets).
- Modèle par défaut : `google/gemini-2.5-flash` (rapide, multimodal, économique) avec fallback `google/gemini-2.5-pro` pour les PDF complexes.
- Avantages : pas de 404 modèle, quotas gérés côté Lovable, gestion 402/429 standardisée, même provider mais stable.

### 2. Extraire le texte du PDF avant d'appeler l'IA

Au lieu d'envoyer le binaire base64 (lourd, cher, limité) :

- Utiliser `unpdf` (`https://esm.sh/unpdf`) côté edge function pour extraire le texte du PDF.
- Découper en pages/chunks (~15–20k caractères par appel IA).
- L'IA ne reçoit que du texte structuré → beaucoup plus fiable pour lister des SKU/prix/tailles, et on peut traiter des PDF de 50–100+ Mo.
- Fallback multimodal (image) uniquement si l'extraction texte est vide (PDF scanné).

### 3. Import par lots avec progression dans le dialog

Modifier `ImportMockupDialog` / `parse-products-pdf` pour supporter les gros catalogues :

- L'edge function retourne les produits page par page (ou chunk par chunk) via un paramètre `chunkIndex` / `totalChunks`.
- Le front boucle sur les chunks, affiche une barre de progression (`X / N pages traitées, Y produits détectés`).
- Résultats agrégés puis dédoublonnés par SKU avant affichage de la table de validation.
- Bouton "Importer tout" qui crée les produits par batch de 20 dans Supabase avec retry par ligne.

## Fichiers touchés

```text
supabase/functions/parse-products-pdf/index.ts   (refonte : unpdf + Lovable AI + chunking)
supabase/functions/_shared/ai-extraction.ts       (nouvelle fonction callLovableAI + extractPdfText)
src/components/admin/ImportMockupDialog.tsx      (progression multi-chunk, batch create)
```

`supabase/functions/_shared/gemini.ts` reste en place pour les autres fonctions ; on ne casse rien.

## Détails techniques

- Limite base64 relevée à 60 Mo côté edge (le PDF n'est plus renvoyé à l'IA, seulement au parser texte).
- Chunk IA : max 15 000 caractères, `response_format: { type: "json_object" }` + prompt strict.
- Dédoublonnage front par `sku` normalisé (trim + upper).
- Erreurs 402 (crédits IA épuisés) et 429 (rate limit) remontées avec un toast clair.

## Ce que ça change côté utilisateur

- Plus d'erreur "Gemini API error" / "File data too large".
- Un catalogue de 200+ produits sur 30+ pages passe en une seule opération, avec progression visible.
- Aucune clé à saisir : Lovable AI utilise `LOVABLE_API_KEY` déjà configurée.

Confirme-moi et je passe en build.