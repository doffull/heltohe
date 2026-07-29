## Edge Function `generate-product-video` (IA vidéo runtime)

### Objectif
Remplacer l'astuce canvas + MediaRecorder de `AiProductVideoButton` par une vraie génération vidéo IA côté serveur, appelable depuis l'admin sur n'importe quelle image produit.

### Provider
Google **Veo 3** via Lovable AI Gateway (endpoint `/v1/videos/generations`, modèle `google/veo-3.0-generate-preview`), image-to-video, 5–8 s, 720p/1080p, audio muet. Utilise `LOVABLE_API_KEY` déjà présent — aucun secret à demander.

### Edge Function `supabase/functions/generate-product-video/index.ts`
- POST `{ imageUrl, prompt?, durationSec?, aspectRatio? }` (défaut : 6 s, 9:16 pour mobile ou 16:9).
- Étapes :
  1. Télécharge l'image (avec User-Agent + retry, comme `virtual-tryon`).
  2. Encode en base64, prompt par défaut : "Cinematic slow-motion product showcase, subtle camera dolly-in, soft studio lighting, no text, no logo, luxury fashion mood".
  3. POST `https://ai.gateway.lovable.dev/v1/videos/generations` → renvoie un `operationId`.
  4. Poll (max ~90 s, backoff 3 s) `/v1/videos/operations/{id}` jusqu'à `done: true`.
  5. Récupère le binaire vidéo (mp4), uploade dans `storage/media/products/videos/{uuid}.mp4`.
  6. Renvoie `{ url, durationSec, model }`.
- CORS, validation Zod du body, propagation propre des 402/429 (crédits IA / rate limit).
- `verify_jwt = false` puis vérif manuelle du JWT (rôle `admin` requis via `has_role`).
- Config dans `supabase/config.toml`.

### Client — refonte de `AiProductVideoButton`
- Bouton "Générer une vidéo IA" avec :
  - Popover réglages : prompt libre (pré-rempli avec nom produit), durée (5 / 8 s), ratio (16:9 / 9:16 / 1:1).
  - Appel `supabase.functions.invoke('generate-product-video', ...)`.
  - Loader + progression indicative ("Génération vidéo IA en cours… ~60 s").
  - Toast succès + callback `onGenerated(url)` qui met à jour `video_url` du produit.
- Fallback conservé : si l'API renvoie 402/429/500 → propose l'ancien canvas-mode ("mode rapide sans IA").

### Intégration `ProductForm`
- Bouton déjà présent au-dessus du champ vidéo — remplacer son handler pour appeler la nouvelle version.
- Ajout d'un badge "Veo 3" à côté du bouton.

### Bonus admin
- Dans `AdminAgentIntegrations` : ligne "Vidéo IA (Veo 3)" avec statut de la fonction et test rapide (image de démo → vidéo).

### Tests
1. Générer une vidéo depuis un produit existant → fichier .mp4 en Storage, `video_url` mis à jour.
2. Vérifier que la vidéo s'affiche dans la galerie produit publique.
3. Erreur 402 propagée avec message clair côté toast.
4. Non-admin bloqué (401).

### Hors-scope
- Génération text-to-video pure (sans image de départ) — pourra être ajoutée plus tard dans les slides marketing.
- Édition de vidéo existante (trim, texte overlay) — hors-scope.
