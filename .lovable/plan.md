
## 1. DeepSeek pour toutes les fonctions IA textuelles

DeepSeek est **compatible OpenAI** (`https://api.deepseek.com/v1/chat/completions`). Confirmé : il ne fait **que du texte** (chat, JSON, function-calling, vision limitée sur `deepseek-vl`, pas d'images/vidéos, pas d'audio). Donc :

**Bascule DeepSeek** (chat completions + JSON) :
- `product-ai-helpers`, `generate-slide-text`, `generate-product-description`, `generate-cta-style`, `contact-chat` (chatbot), `voice-command`, `recommend-size`, `verify-customer-info`, `boutique-lookup`, `mcp` (AI reasoning côté serveur), `parse-stock-pdf` (texte extrait), et la partie **texte** de `parse-products-pdf` (le texte JSON structuré une fois les pages rasterisées).

**Restent sur Lovable AI Gateway** (vision + génération) — la seule voie fiable aujourd'hui :
- `virtual-tryon` (image edit, Gemini `nano-banana`)
- `generate-slide-image` (image gen)
- `analyze-product-image` (vision Gemini)
- `template-from-mockup` (vision Gemini)
- La phase **vision** de `parse-products-pdf` (lecture des maquettes)

Un bouton IA vidéo si présent : reste sur son provider actuel (DeepSeek ne fait pas de vidéo).

### Mise en œuvre technique

- Nouveau helper partagé `supabase/functions/_shared/deepseek.ts` : wrapper `callDeepseek({ messages, response_format?, tools?, temperature? })` qui appelle `https://api.deepseek.com/v1/chat/completions`, modèle `deepseek-chat` par défaut (ou `deepseek-reasoner` si l'appelant le demande), gère 402/429, renvoie une `Response` (mode SSE ou JSON) comme l'ancien `callGemini`.
- Le fichier existant `_shared/gemini.ts` devient un shim qui **appelle `callDeepseek`** pour préserver toutes les Edge Functions text-only sans les toucher une à une (ce fichier centralise déjà 100 % du texte IA).
- Nouveau secret `DEEPSEEK_API_KEY` demandé via le formulaire sécurisé.
- Les Edge Functions vision/image (`virtual-tryon`, `analyze-product-image`, `template-from-mockup`, `generate-slide-image`, phase vision de `parse-products-pdf`) continuent d'utiliser directement `ai.gateway.lovable.dev` avec `LOVABLE_API_KEY` — non impactées.
- Un badge visible dans `AdminAgentIntegrations` ou `AdminChatbot` indique "Texte : DeepSeek · Vision/Images : Lovable AI".

Résultat : tes crédits Lovable AI ne sont plus consommés par le texte (chatbot, descriptions, extraction texte, commande vocale, imports produits). Ils restent uniquement sur la partie visuelle qui n'a pas d'équivalent DeepSeek.

## 2. Shuffle + tri manuel par catégorie

**Comportement** : à chaque affichage de catégorie, l'ordre des produits est **aléatoire** (shuffle). Sauf si un ordre manuel a été défini pour cette catégorie dans l'admin — auquel cas cet ordre est respecté strictement.

### Base de données
Nouvelle table `product_category_order` :
```
category_slug text, product_id uuid, position int, updated_at timestamptz
PRIMARY KEY (category_slug, product_id)
```
RLS : lecture publique, écriture réservée admin. GRANT SELECT anon/authenticated, ALL service_role.

### Frontend catégorie (`Shop.tsx` / `CategoryPageRouter.tsx`)
- Charger `product_category_order` filtré sur le slug courant.
- Si des lignes existent → trier par `position` ascendant + append à la fin les produits non listés dans un ordre stable.
- Sinon → **shuffle déterministe par session** (`Math.random` seeded une fois au montage) pour éviter le re-mélange à chaque re-render mais changer à chaque visite.

### Admin — drag-and-drop par catégorie
Nouvelle page ou onglet `AdminProducts` → sélecteur de catégorie (Homme, Femme, Sportswear, Enfant, + toutes les catégories dynamiques de `useCategories`) → liste `dnd-kit` (déjà installé) des produits de cette catégorie, glisser-déposer pour réorganiser, bouton "Réinitialiser (shuffle)" pour supprimer les lignes de la catégorie. Sauvegarde debounced (upsert batch).

Composant : `AdminCategoryOrdering.tsx` intégré comme nouvel onglet "Rangement" dans `AdminProducts`.

## 3. Suppression de la barre "Admin Drag" en bas

Supprimer complètement :
- `src/components/admin/AdminDragBar.tsx` (fichier)
- Toutes ses importations et usages (probablement dans `MainLayout.tsx` ou `Admin.tsx`)
- Nettoyage : `AdminViewportContext` (`snap`, `locked`, `device override`) est **conservé** car il alimente `useAdminDrag` pour les drags Techwear/FAB. Seule la **UI de contrôle** disparaît ; les défauts (snap=true, locked=false, override=off) restent codés en dur.
- Vérification `rg AdminDragBar` pour purger toute trace.

## Ordre d'exécution

1. Demander `DEEPSEEK_API_KEY` via le formulaire sécurisé.
2. Écrire `_shared/deepseek.ts` + réécrire `_shared/gemini.ts` en shim.
3. Supprimer `AdminDragBar.tsx` et ses imports.
4. Migration SQL `product_category_order` + GRANT + RLS.
5. Hook `useCategoryOrder(slug)` + intégration shuffle/tri dans les pages catégorie.
6. Onglet "Rangement" dans `AdminProducts` avec dnd-kit.
7. Test : chatbot répond via DeepSeek, catégorie shuffle à froid, ordre respecté après drag admin, barre du bas absente.

## Détails techniques

- **DeepSeek endpoint** : `POST https://api.deepseek.com/v1/chat/completions` — headers `Authorization: Bearer $DEEPSEEK_API_KEY` + `Content-Type: application/json`. Body OpenAI-compat : `{ model: "deepseek-chat", messages, response_format?, tools?, stream? }`. Erreurs 402/429/5xx propagées.
- **Modèles** : `deepseek-chat` (rapide/économique, défaut) ; `deepseek-reasoner` seulement pour la logique complexe (import produits massif, chatbot support).
- **Shuffle stable par session** : `useMemo(() => shuffle(products, seedFromDate), [products])` avec seed = `Date.now() / 3600000 | 0` (change toutes les heures) OU seed = sessionStorage ID (change à chaque nouvel onglet). Je pars sur session ID.
- **DnD** : `@dnd-kit/core` + `@dnd-kit/sortable` déjà utilisés ailleurs dans le projet (aperçu via imports).
- **Anti-régression drag Techwear/FAB** : `AdminViewportContext` reste, seul l'UI `AdminDragBar` disparaît — vérification que rien d'autre n'importe le composant.
