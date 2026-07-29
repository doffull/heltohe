
# Plan — Variantes avancées, défauts globaux, tri, et retour à Gemini

## 1. Éditeur de variantes produit enrichi (`ProductForm.tsx`)

**Tailles**
- Bloc "Tailles" avec ajout / suppression libre (input + bouton +, croix sur chaque puce).
- Réordonnancement par glisser-déposer (dnd-kit, déjà utilisé) — l'ordre saisi est celui affiché en boutique.
- Bouton "Charger un preset" : Homme/Femme (XS→XXXL), Enfant (2A, 4A, 6A, 8A, 10A, 12A, 14A), Chaussures, Numérique.
- Bouton "Appliquer les tailles par défaut globales" (voir §3).

**Couleurs & bicolores**
- Chaque variante couleur peut désormais avoir :
  - un swatch **uni** (hex),
  - un swatch **bicolore** (2 hex, split diagonal 45°, cohérent avec la charte),
  - une **image swatch** (PNG/JPG) ou **texture** uploadée en drag-and-drop → bucket `media`, sous-dossier `swatches/`.
- Zone de drop dédiée par variante : accepte fichier ou glisser depuis la médiathèque.
- Suppression individuelle de chaque couleur + réordonnancement dnd-kit.
- Rendu du swatch dans les cartes produit et fiche : uni / bicolore (CSS `linear-gradient(135deg, #A 50%, #B 50%)`) / image (background-image).

**Spécifications techniques**
- Section "Spécifications" éditable : matière, entretien, poids, composition, origine, sous forme de paires clé/valeur libres (déjà dispo via `attributes` — on expose une UI dédiée avec add/remove/reorder).

## 2. Types & rendu

- Étendre `ColorOption` (`src/types/index.ts`) :
  ```
  { name, hex, hex2?, swatchImage?, image?, images? }
  ```
- Adapter `ProductCard`, `ProductOptions`, sélecteurs de couleurs pour afficher :
  - hex uni → pastille couleur,
  - hex + hex2 → gradient 45°,
  - swatchImage → image en background.
- Le champ `sizes` du produit reste `string[]` ; l'ordre du tableau = ordre d'affichage.

## 3. Défauts globaux (Admin → Réglages produits)

Réutiliser `design_settings.settings_json` (déjà en place) sous la clé `productDefaults` :
```
{
  material: "Polyester",
  careInstructions: "Lavable en machine à 30°C",
  sizesByCategory: {
    homme:  ["XS","S","M","L","XL","XXL","XXXL"],
    femme:  ["XS","S","M","L","XL","XXL","XXXL"],
    enfant: ["2A","4A","6A","8A","10A","12A","14A"],
    sportswear: ["S","M","L","XL"]
  }
}
```
- Nouvel onglet "Défauts produits" dans `AdminSettings` : édition des 4 listes (add/remove/reorder) + champs matière/entretien.
- À la création d'un produit : préremplissage automatique selon la catégorie choisie + matière/entretien.
- Bouton "Réappliquer les défauts" dans `ProductForm` pour un produit existant.
- Migration douce : script SQL one-shot qui, sur les produits enfant sans tailles cohérentes, injecte `["2A","4A","6A","8A","10A","12A","14A"]` (uniquement si la liste actuelle est vide).

## 4. Tri personnalisé des produits

Le rangement par catégorie existe déjà (`product_category_order` + `AdminCategoryOrdering`). Ce plan ajoute :
- Un tri **global** (toutes catégories confondues) via `AdminProducts` : nouveau mode "Tri manuel" (drag-and-drop sur la liste filtrée courante) sauvegardé dans la même table avec `category_slug='__global__'`.
- Boutons rapides : "Trier par nom", "Trier par prix ↑/↓", "Shuffle", "Rétablir manuel".
- Respecté par `Shop.tsx` en absence d'ordre catégorie spécifique.

## 5. Retour de l'IA vers Gemini (via Lovable AI Gateway)

Objectif utilisateur : Gemini pour texte, chatbot, images, vidéos, virtual try-on.

- `supabase/functions/_shared/gemini.ts` : le shim DeepSeek est retiré. Toutes les requêtes (texte + vision) repartent sur `https://ai.gateway.lovable.dev/v1/chat/completions` avec `LOVABLE_API_KEY`.
  - Défaut texte : `google/gemini-2.5-flash`
  - Défaut vision : `google/gemini-2.5-flash` (inchangé)
  - Défaut image gen (déjà utilisé dans `generate-slide-image`, `virtual-tryon`) : `google/gemini-2.5-flash-image-preview`
- Suppression des références DeepSeek dans le badge admin (`AdminAgentIntegrations` / `AdminChatbot`) — remplacé par "Propulsé par Gemini via Lovable AI".
- Le secret `DEEPSEEK_API_KEY` n'est plus lu. Aucun secret à demander (LOVABLE_API_KEY déjà configuré).
- Vidéo : ajouter un bouton "Générer vidéo produit (Gemini Veo via Lovable)" dans `ProductForm` — appelle une nouvelle edge function `generate-product-video` qui utilise le gateway (fallback UX si non disponible : message clair).

## 6. Détails techniques

- **Swatch uploads** : `supabase.storage.from('media').upload('swatches/<uuid>.<ext>')` + `getPublicUrl`, taille max 2 Mo, formats PNG/JPG/WEBP.
- **Bicolore rendering** : util `swatchStyle(color: ColorOption)` centralisé dans `src/lib/swatch.ts` — utilisé par ProductCard, ProductOptions, ProductForm preview.
- **dnd-kit** : `SortableContext` par bloc (tailles, couleurs, specs). Handle drag visible en mode admin.
- **Migration BDD** : aucune modification de schéma nécessaire (`sizes text[]`, `color_options jsonb`, `attributes jsonb` couvrent tous les besoins). Un script SQL de fond pour hydrater les défauts enfant (idempotent).
- **Ordre de sauvegarde produit** : `useUpdateProduct` déjà patché pour n'envoyer que les champs modifiés — pas de régression sur les autres colonnes.
- **Fallback Gemini** : sur 402/429, message admin explicite avec lien crédits (déjà en place, on garde).

## 7. Ordre d'exécution

1. Créer `src/lib/swatch.ts` + étendre le type `ColorOption`.
2. Réécrire les sections Tailles / Couleurs / Specs de `ProductForm.tsx` (add/remove/reorder + drop swatch).
3. Adapter `ProductCard` et `ProductOptions` au nouveau rendu de swatch.
4. Ajouter onglet "Défauts produits" dans `AdminSettings` (lecture/écriture `design_settings.settings_json.productDefaults`).
5. Préremplissage à la création de produit + bouton "Réappliquer défauts".
6. Étendre `AdminCategoryOrdering` avec l'onglet "Tri global" + tris rapides.
7. Réécrire `_shared/gemini.ts` en client Lovable AI direct (retrait DeepSeek).
8. Mettre à jour les badges admin ("Propulsé par Gemini").
9. Nouvelle edge function `generate-product-video` + bouton dans `ProductForm`.
10. Script SQL idempotent pour tailles enfant par défaut.
11. Tests manuels : ajout/suppression tailles, drop d'un PNG couleur, bicolore rendu correct sur carte produit, chatbot répond via Gemini, virtual try-on OK, tri global respecté.
