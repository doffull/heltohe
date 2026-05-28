# Plan

## 1. Boutique IA (admin) — cache, images, filtre, validation

**`supabase/functions/boutique-lookup/index.ts`**
- Ajouter `places.photos` au `X-Goog-FieldMask` (déjà demandé) + récupérer 1ʳᵉ photo via `places/v1/{photoName}/media?maxWidthPx=600&skipHttpRedirect=true` → renvoie `photoUri` qu'on met dans `image`.
- Ajouter filtre type : passer `includedType: 'shopping_mall'` (ou liste configurable côté admin) — paramètre optionnel `type` dans le body (`mall | store | any`, défaut `any`).

**`src/pages/admin/AdminBoutiques.tsx`**
- **Cache mémoire** : `Map<query, candidates>` (clé = query+type) pour éviter de re-fetcher les mêmes recherches pendant la session.
- **Filtre** : petit `<Select>` dans le dialog (Tous / Centre commercial / Boutique) qui pilote `type` envoyé à l'edge function.
- **Afficher les images** : vignette 48×48 à gauche de chaque candidat dans la liste de suggestions.
- **Étape de validation** : la sélection d'un candidat n'auto-remplit plus le formulaire principal ; elle ouvre une mini-preview (image + adresse + GPS + bouton "Voir sur la carte" mini-iframe Google Maps) avec deux boutons : **Annuler** / **Utiliser ces informations**. Seul "Utiliser" pousse les valeurs dans `form`.

## 2. Catégories admin — mobile

**`src/pages/admin/AdminSettings.tsx`**
- Les boutons Edit/Delete sont actuellement dans une rangée droite qui sort de l'écran à 360px. Solution :
  - Wrapper le bloc catégorie en `flex-col sm:flex-row` avec les boutons sur une 2ᵉ ligne sur mobile.
  - Boutons en `flex-shrink-0` avec `w-9 h-9` tactiles.
  - Ajouter `min-w-0` + `truncate` sur le titre pour éviter l'overflow.
- Vérifier sous-catégories et orphelines (mêmes patches).

## 3. Nouvelle page "Trouver une boutique" avec map + recherche

**Routing**
- `/boutiques` → reste la page actuelle (liste éditoriale).
- **Nouvelle route `/trouver-une-boutique`** → nouvelle page `StoreLocator.tsx`.
- Lien "Trouver une boutique" dans la sidebar/menu pointera vers `/trouver-une-boutique` (à mettre à jour là où le label apparaît).

**`src/pages/StoreLocator.tsx` (nouveau)**
- Header avec barre de recherche unique + bouton 📍 "Près de chez moi".
- Recherche libre filtre `boutiques` côté client sur : nom, ville, code postal (≈ département via 2 premiers chiffres), adresse.
- Bouton géoloc : `navigator.geolocation.getCurrentPosition` → calcule distance Haversine, trie par proximité, centre la map sur l'utilisateur (marker bleu).
- Layout : map plein écran (gauche/haut) + liste scrollable (droite/bas) — split-screen desktop, stack mobile.
- Marqueurs Google Maps (mêmes InfoWindows enrichies que `Boutiques.tsx` : image, adresse, bouton Itinéraire). Clic sur un item de liste → pan+zoom + ouvre l'InfoWindow.
- Affichage de la distance en km si géoloc activée.

**`src/App.tsx`** : enregistrer la nouvelle route.

## Détails techniques

- Cache IA : simple `Map` au niveau module dans `AdminBoutiques.tsx` (pas de persistance disque, suffit pour la session).
- Photos Places (New) : l'URL `media` retournée nécessite la clé ; on la résout côté edge function et on renvoie le `photoUri` final dans `image`.
- Haversine inline (pas de dépendance).
- Pas de changement de schéma DB.

## Fichiers touchés
- `supabase/functions/boutique-lookup/index.ts` (images + filtre type)
- `src/pages/admin/AdminBoutiques.tsx` (cache, images, filtre, preview validation)
- `src/pages/admin/AdminSettings.tsx` (responsive mobile catégories)
- `src/pages/StoreLocator.tsx` (nouveau)
- `src/App.tsx` (route)
- Sidebar/menu : mettre à jour le lien "Trouver une boutique"
