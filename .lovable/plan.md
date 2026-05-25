# Migration vers ton compte Gemini (Gemini 2.5 Pro)

## Objectif
Remplacer l'AI Gateway Lovable (qui consomme tes crédits Lovable et tombe en 402) par des appels directs à l'API Google Gemini avec **ta propre clé API**. Toute l'IA du site passera par **ton compte Google**, facturé directement par Google.

## Étape 1 — Ajout de ta clé API
Je te demanderai d'ajouter un secret `GEMINI_API_KEY` (formulaire sécurisé, jamais visible côté client). Tu colles la clé de https://aistudio.google.com/apikey.

## Étape 2 — Edge functions à migrer (11 fonctions)
Pour chacune, remplacer l'appel `https://ai.gateway.lovable.dev/v1/chat/completions` (format OpenAI) par l'API Google native `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent` (format Gemini natif) :

- `contact-chat` (chatbot streaming)
- `voice-command` (commande vocale)
- `analyze-product-image` (analyse mockup produit)
- `generate-product-description` (descriptions produits)
- `parse-products-pdf` + `parse-stock-pdf` (import catalogue/stock)
- `recommend-size` (recommandation taille)
- `verify-customer-info` (vérif identité commande)
- `product-ai-helpers` (helpers produits)
- `generate-cta-style` + `generate-slide-text` (éditeur visuel)

Modèle utilisé partout : **`gemini-2.5-pro`**.

Pour le streaming (`contact-chat`, `voice-command`) : utiliser `:streamGenerateContent?alt=sse` et adapter le parser SSE côté client.

## Étape 3 — Cas spécial : génération d'images
`generate-slide-image` utilise actuellement Nano Banana (Gemini 2.5 Flash Image) via Lovable. **Gemini 2.5 Pro ne génère pas d'images.** Deux options :
- **A (recommandé)** : garder Nano Banana sur l'AI Gateway Lovable uniquement pour la génération d'images (peu coûteux, peu utilisé).
- **B** : migrer aussi vers l'API Google Imagen 3 (nécessite Vertex AI + facturation GCP, plus complexe).

Je pars sur **option A** sauf indication contraire.

## Étape 4 — Mémoire projet
Mettre à jour `mem://backend/architecture-supabase` pour acter que l'IA passe par `GEMINI_API_KEY` directe (modèle `gemini-2.5-pro`), et non plus par Lovable AI Gateway.

## Détails techniques

Format Gemini natif (différent d'OpenAI) :
```ts
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}
{
  "system_instruction": { "parts": [{ "text": "..." }] },
  "contents": [{ "role": "user", "parts": [{ "text": "..." }] }],
  "generationConfig": { "temperature": 0.1, "responseMimeType": "application/json" }
}
```

Pour images (vision) : `parts: [{ inline_data: { mime_type, data: base64 } }, { text }]`.

Gestion d'erreurs préservée (429 rate limit, 402 quota → message clair côté UI).

## Ce qui ne change pas
- Aucune modification du frontend visuelle (header, hero, etc.)
- Pas de migration SQL
- Pas de changement RLS
- Le chatbot, le vocal, l'éditeur, les imports — tout continue de fonctionner pareil côté utilisateur

## Risques
- Si tu épuises ton quota Google gratuit, l'IA tombera en erreur 429 (même comportement qu'aujourd'hui avec Lovable). Tu pourras ajouter de la facturation directement dans Google Cloud.
- Gemini 2.5 Pro est plus lent que Flash sur les requêtes simples (chatbot). Si la latence te gêne, on pourra basculer le chatbot sur Flash plus tard.
