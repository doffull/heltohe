# Plan : remplacer Gemini par GPT (OpenAI) partout

## Objectif
Supprimer toute dépendance à `GEMINI_API_KEY` et aux modèles `google/gemini-*` et basculer sur `openai/gpt-5-mini` via la passerelle native Lovable AI (`LOVABLE_API_KEY`, déjà provisionnée — pas de clé à saisir).

## Ce qui change

### 1. Helper partagé `supabase/functions/_shared/gemini.ts`
Réécriture complète en helper OpenAI :
- Renommer en interne la fonction `callGemini` → conserver le nom exporté (`callGemini`, `callGeminiText`) pour éviter de toucher 8 fonctions, mais l'implémentation appelle `https://ai.gateway.lovable.dev/v1/chat/completions` avec `Authorization: Bearer ${LOVABLE_API_KEY}` et modèle par défaut `openai/gpt-5-mini`.
- Supprimer toute la logique d'auto-détection de modèle Gemini, le fallback `gemini-2.5-flash`, et l'appel direct à l'API Google.
- Retourner une réponse au format OpenAI standard (déjà attendu par les appelants).

### 2. Fonctions edge (modèle → `openai/gpt-5-mini`)
Texte pur (remplacement 1-pour-1 du modèle) :
- `contact-chat` (chatbot support)
- `product-ai-helpers` (attributs, nom couleur)
- `recommend-size` (guide des tailles IA)
- `verify-customer-info` (validation commandes)
- `generate-product-description`
- `generate-slide-text`
- `generate-cta-style`
- `voice-command`
- `analyze-product-image` (multimodal texte+image, GPT-5-mini supporte)
- `parse-products-pdf` (extraction texte)
- `parse-stock-pdf`

### 3. Fonctions de génération d'image
Ces fonctions utilisaient `google/gemini-2.5-flash-image` pour produire une image en sortie. GPT ne fait pas d'image via `/v1/chat/completions` — il faut passer par `/v1/images/generations` avec `openai/gpt-image-2` (endpoint et payload différents) :
- `generate-slide-image` : migration vers `openai/gpt-image-2` (text→image, quality "low").
- `virtual-tryon` : migration vers `openai/gpt-image-2` en mode édition multi-images (photo utilisateur + produit) via `/v1/images/edits`.
- `template-from-mockup` : reste sur `/v1/chat/completions` mais bascule sur `openai/gpt-5-mini` (analyse d'une maquette pour renvoyer du JSON, pas de génération d'image).

### 4. Secret `GEMINI_API_KEY`
Ne plus lire cette variable. Le secret peut être supprimé côté projet une fois la migration validée (à faire par l'utilisateur dans les paramètres — non détruit automatiquement).

### 5. UI
Aucun changement côté frontend : les composants (`AiAttributesButton`, `SizeGuideAIModal`, `VirtualTryOnButton`, `ImportMockupDialog`, chatbot, etc.) appellent toujours les mêmes edge functions.

## Points d'attention
- **Essayage virtuel** : `gpt-image-2` en mode édition accepte plusieurs images d'entrée mais le rendu photoréaliste "person + garment" peut être moins fidèle que Gemini Nano Banana sur ce cas précis. À valider après migration ; on pourra affiner le prompt si besoin.
- **Coûts** : `openai/gpt-5-mini` est en mode "priority" possible (`service_tier: "priority"`) si tu veux plus de vitesse — non activé par défaut dans ce plan.
- **Compatibilité** : puisqu'on garde les noms `callGemini`/`callGeminiText` dans le helper, aucun appelant n'a besoin d'être réécrit hors changement de la chaîne `model`.

## Résultat
- Plus aucune référence à `GEMINI_API_KEY` ni à `google/*` dans le code.
- Toutes les fonctions IA utilisent `LOVABLE_API_KEY` + `openai/gpt-5-mini` (ou `openai/gpt-image-2` pour la génération d'images).
- Fin des erreurs "invalid Gemini API key".
