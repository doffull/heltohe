## Objectif

Migrer toutes les fonctions IA texte/vision du site vers **`google/gemini-3.5-flash`** (dernière version disponible sur Lovable AI), pour bénéficier d'un meilleur raisonnement, d'une vitesse accrue et d'une qualité de réponse améliorée sur l'ensemble des features IA.

## Modèle cible

- **Texte + Vision** → `google/gemini-3.5-flash` (nouveau)
- **Génération d'images** → inchangé (`gemini-2.5-flash-image` / Nano Banana — Gemini 3.5 ne génère pas d'image)

## Fonctions Edge à mettre à jour (13 emplacements dans 11 fichiers)

| Fichier | Modèle actuel | Nouveau modèle |
|---|---|---|
| `product-ai-helpers/index.ts` (sous-titre, description, matière, entretien, attributs, nom couleur) | `gemini-2.5-flash` + `gemini-2.5-pro` (vision) | `gemini-3.5-flash` |
| `generate-product-description/index.ts` | `gemini-2.5-flash-lite` | `gemini-3.5-flash` |
| `analyze-product-image/index.ts` (vision produit) | `gemini-2.5-pro` | `gemini-3.5-flash` |
| `parse-products-pdf/index.ts` (import catalogue PDF) | `gemini-2.5-flash` | `gemini-3.5-flash` |
| `parse-stock-pdf/index.ts` (import stock PDF) | `gemini-2.5-pro` | `gemini-3.5-flash` |
| `contact-chat/index.ts` (chatbot support streaming) | `gemini-3-flash-preview` | `gemini-3.5-flash` |
| `voice-command/index.ts` (×2) | `gemini-3-flash-preview` | `gemini-3.5-flash` |
| `recommend-size/index.ts` | `gemini-3-flash-preview` | `gemini-3.5-flash` |
| `verify-customer-info/index.ts` (scoring identité commande) | `gemini-2.5-flash` | `gemini-3.5-flash` |
| `generate-slide-text/index.ts` | `gemini-2.5-flash` | `gemini-3.5-flash` |
| `generate-cta-style/index.ts` | `gemini-2.5-flash` | `gemini-3.5-flash` |
| `generate-slide-image/index.ts` | `gemini-2.5-flash-image` | **inchangé** (image gen) |

## Notes techniques

- `gemini-3.5-flash` est multimodal (texte + image), donc le fallback `gemini-2.5-pro` pour la vision dans `product-ai-helpers` n'est plus nécessaire — un seul modèle pour tous les cas.
- Aucune modification frontend nécessaire : les fonctions Edge encapsulent le choix du modèle.
- Aucune migration DB.
- Toutes les fonctions seront redéployées automatiquement.

## Déploiement

Après les modifications, les 11 edge functions seront redéployées en une fois. La validation se fera via un appel test au chatbot `contact-chat` et au bouton ✨ de description produit pour confirmer que `gemini-3.5-flash` répond bien.
