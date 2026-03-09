
## Trois problèmes, une page nouvelle

---

### 1. Variations couleur ne changent pas l'image

**Cause racine identifiée** : Dans la DB, les `color_options` du produit VANCOUVER contiennent `{color: "#1C1C1E", label: "Noir"}` — les couleurs sont des **hex codes** comme `#1C1C1E`, `#2A3C82`, etc. Mais dans `ProductImageGallery.tsx`, le match se fait via :

```typescript
const activeColorOption = colorOptions.find(c => c.color === selectedColor);
```

Et dans `ProductOptions.tsx`, les swatches utilisent `item.key = co.color` (le hex). Donc quand l'user clique, `onColorChange('#1C1C1E')` est appelé et `selectedColor` prend la valeur `'#1C1C1E'`. Le match `c.color === selectedColor` devrait fonctionner…

**Vrai problème** : Les colorOptions dans les données de test **n'ont pas de `image`** associée (sauf ATLANTA qui en a une). Sans image dans `co.image`, `displayImage` reste l'image par défaut du produit. Le comportement "ne change rien" vient du fait qu'aucune des variations n'a d'image différente → la galerie affiche toujours la même image principale.

**Solution** : 
1. Le badge couleur dans la galerie s'affiche déjà (overlay top-left) ✓
2. Ajouter un effet visuel clair quand une couleur est sélectionnée MÊME si elle n'a pas d'image associée : teinte de fond colorée + badge visible + barre active dans les thumbnails
3. Le `selectedColor` est bien propagé, le swatch s'active (ring-2), et le badge s'affiche — le problème est que sans `co.image`, l'image ne change pas. C'est **le comportement attendu** quand les couleurs n'ont pas d'image distincte.

**La vraie correction** : améliorer le feedback visuel pour que le clic soit clairement ressenti même sans changement d'image :
- Ajouter un léger flash d'animation sur le conteneur image quand la couleur change
- Le badge couleur en overlay avec le nom de la couleur sélectionnée doit s'afficher même sans `co.image` (actuellement `activeColorOption` peut être null si `selectedColor` ne matche pas)
- Ajouter un `key` sur l'image pour forcer la ré-animation même si `displayImage` ne change pas

---

### 2. Logo "cassé" → logo blanc sur fond blanc

**Cause identifiée** : La requête DB confirme que le logo existe : `https://bumfyrfmormisyjletpb.supabase.co/storage/v1/object/public/media/branding/1773001616388-y056nu.png`. La capture d'écran montre que l'image est **entièrement blanche** — le logo est probablement blanc/transparent sur fond blanc, le rendant invisible.

**Solution** : Ajouter un `background` sombre derrière le logo dans tous les emplacements où il s'affiche (header, sidebar, splash screen, footer). Ou ajouter un `drop-shadow` qui le rend visible quelle que soit la couleur du fond.

Concrètement :
- Header : `filter: drop-shadow(0 0 6px rgba(0,0,0,0.4))` ou wrapper avec padding sombre
- Sidebar : idem
- Splash screen : fond sombre déjà présent, mais ajouter `filter: invert(1)` si le fond est clair pour les logos blancs
- Une option propre : ajouter dans AdminDesign une option "fond sous le logo" (petit toggle) + dans le code, entourer le logo d'un `div` semi-transparent quand c'est activé

**Approche retenue** (sans toucher à l'admin) : Ajouter `filter: drop-shadow(0 0 8px rgba(0,0,0,0.6))` sur tous les `<img>` logo. Ainsi un logo blanc devient visible sur fond clair ET sur fond sombre.

---

### 3. Page Contact avec chatbot IA

Créer `/contact` avec :
- Formulaire de contact classique (nom, email, message) → stocké en DB
- Section chatbot IA avec réponses automatiques alimentées par `LOVABLE_API_KEY` (déjà disponible)
- Edge function `contact-chat` pour appeler l'IA

**Architecture** :

```
src/pages/Contact.tsx              ← page avec 2 sections
supabase/functions/contact-chat/   ← edge function IA (streaming)
supabase/migrations/...            ← table contact_messages
```

**DB** : Table `contact_messages` (id, name, email, message, created_at) — publique en INSERT seulement (RLS).

**IA** : Le bot est configuré avec un system prompt qui parle de la marque LVTK6, répond aux questions sur les produits, livraisons, retours. Streaming token-par-token.

**Routing** : Ajouter `<Route path="/contact" element={<MainLayout><Contact /></MainLayout>} />` dans `App.tsx`. Ajouter "Contact" dans les nav items (déjà présent dans `translations`).

---

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/product/ProductImageGallery.tsx` | Forcer re-animation sur changement couleur + badge toujours visible + feedback visuel amélioré |
| `src/components/layout/MainLayout.tsx` | `drop-shadow` sur logo header + ajouter lien Contact dans nav |
| `src/components/layout/Sidebar.tsx` | `drop-shadow` sur logo |
| `src/App.tsx` | `SplashScreen` drop-shadow + ajouter route `/contact` |
| `src/pages/Contact.tsx` | Nouvelle page : formulaire + chatbot IA |
| `supabase/functions/contact-chat/index.ts` | Edge function streaming IA |
| `supabase/config.toml` | Ajouter `[functions.contact-chat] verify_jwt = false` |
| Migration SQL | Table `contact_messages` avec RLS |

---

### Détail chatbot

System prompt :
```
Tu es l'assistant virtuel de LVTK6, une marque de streetwear/concept. Tu réponds aux questions sur les produits, la livraison (gratuite dès 200€ en point relais), les retours (30 jours), la garantie (1 an), et les tailles. Tu restes concis, professionnel et dans le ton de la marque. Si tu ne sais pas, tu proposes de contacter le service client par email.
```

Le chat est persisté localement (useState), pas en DB — seuls les formulaires de contact classiques sont sauvegardés.
