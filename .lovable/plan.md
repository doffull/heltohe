## 1. Catégories admin — boutons Modifier / Supprimer visibles + confirmation

**Où :** `src/pages/admin/AdminSettings.tsx` (onglet Catégories). Les actions existent déjà mais sont cachées dans un menu "⋯" peu visible, et la confirmation utilise `window.confirm()` (popup système).

**Changements :**
- Remplacer le `DropdownMenu` (sur catégories racines, sous-catégories et orphelines) par **deux boutons icônes visibles côte à côte** : ✏️ Modifier (variant `ghost`) + 🗑️ Supprimer (variant `ghost`, texte rouge).
- Remplacer `window.confirm()` par un **`AlertDialog`** stylé (composant shadcn déjà présent) avec :
  - Titre : « Supprimer cette catégorie ? »
  - Description : « Cette action est définitive. Les produits liés ne seront pas supprimés mais perdront cette catégorie. » (mention sous-catégorie adaptée si besoin)
  - Boutons : « Annuler » + « Supprimer » (rouge)
- Un seul state `catToDelete: CategoryRecord | null` pilote le dialog.

## 2. Boutiques admin — création assistée par IA depuis le nom

**Où :** `src/pages/admin/AdminBoutiques.tsx` + nouvelle Edge Function.

**UX :**
- Dans le dialog « Nouvelle boutique », à côté du champ **Nom**, ajouter un bouton « ✨ Rechercher avec l'IA ».
- Au clic (ou auto-déclenché 800 ms après la saisie d'au moins 4 caractères), appel à l'Edge Function. Spinner pendant la recherche.
- Si plusieurs candidats sont trouvés → petite liste déroulante sous le champ pour choisir (ex : « Galeries Lafayette Haussmann — 40 Bd Haussmann, 75009 Paris »).
- Au choix : remplissage automatique de **adresse, code postal, ville, pays, latitude, longitude, image** (photo Google si dispo, sinon icône `Store` SVG par défaut). Toast « Boutique trouvée ✨ ».
- L'utilisateur peut toujours corriger manuellement avant « Enregistrer ».

**Edge Function `boutique-lookup` :**
- Input : `{ query: string }` (nom de boutique/centre commercial, facultativement biaisé sur la France).
- Appelle **Google Places API (New) `places:searchText`** via le connector gateway (déjà connecté) avec `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents,places.photos`.
- Pour la photo (1ʳᵉ disponible) : récupère via `places/v1/{photoName}/media?maxWidthPx=800` et renvoie l'URL Google directement (le navigateur peut l'afficher).
- Retourne jusqu'à 5 candidats normalisés `{ name, address, postalCode, city, country, lat, lng, image }`.

## 3. Boutiques publiques — popup riche + itinéraire

**Où :** `src/pages/Boutiques.tsx`.

- Au clic d'un marker OU d'une carte de la liste, ouvrir une **InfoWindow enrichie** :
  - Nom (bold), image (si dispo), adresse complète.
  - Bouton **« Itinéraire »** → ouvre `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&destination_place_id=...` dans un nouvel onglet (utilise l'appli Google Maps native sur mobile).
  - Bouton **« Appeler »** masqué (pas de téléphone en base — on l'ajoutera si demandé).
- Fermeture des autres InfoWindow avant d'ouvrir la nouvelle.

## Détails techniques

- **Pas de migration DB** nécessaire (colonnes `image`, `latitude`, `longitude` déjà présentes sur `boutiques`).
- **Connector Google Maps** déjà actif (la page publique l'utilise déjà). L'Edge Function réutilisera `LOVABLE_API_KEY` + `GOOGLE_MAPS_API_KEY` (auto-injectés).
- **Sécurité** : Edge Function `verify_jwt = false` (lookup public côté admin authentifié uniquement via l'UI, pas de données sensibles renvoyées).
- **Fallback** : si l'IA ne trouve rien, on garde le bouton « Trouver les coordonnées GPS automatiquement » (Nominatim) existant.

## Fichiers touchés

- `src/pages/admin/AdminSettings.tsx` — refactor boutons cat. + AlertDialog
- `src/pages/admin/AdminBoutiques.tsx` — recherche IA par nom
- `src/pages/Boutiques.tsx` — InfoWindow + bouton Itinéraire
- `supabase/functions/boutique-lookup/index.ts` — nouveau
- `supabase/config.toml` — déclarer la nouvelle fonction (`verify_jwt = false`)
