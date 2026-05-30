# Section "Nos boutiques" sur la home

Ajouter, juste sous la grille des catégories (Homme/Femme/Sportswear/Enfants), une nouvelle section qui permet de trouver une boutique ou un stand : barre de recherche + bouton de géolocalisation. À la validation, une pop-up s'ouvre avec une carte (Google Maps) affichant soit la boutique choisie, soit toutes les boutiques de France.

## Comportement

1. Section "Nos boutiques / Nos stands" affichée sous le bloc Catégories.
   - Petit titre éditorial (style cohérent avec les autres sections : `// BOUTIQUES`, H2 "Où nous trouver").
   - Sous-titre court : "Trouvez la boutique ou le stand le plus proche."
   - **Barre de recherche** (ville, code postal, nom) avec autocomplétion sur la liste des boutiques (`useBoutiques`).
   - **Bouton "Près de chez moi"** → `navigator.geolocation`, trie les boutiques par distance (haversine, déjà utilisé dans `StoreLocator.tsx`).
   - **Bouton "Voir toutes les boutiques"** → ouvre la pop-up avec toutes les boutiques.

2. Au clic sur un résultat (suggestion ou bouton "voir tout") → ouverture d'un **Dialog** (shadcn) plein écran sur mobile / large sur desktop contenant :
   - Une carte Google Maps (clé `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`, chargement async + callback, comme dans `Boutiques.tsx`/`StoreLocator.tsx`).
   - Si une boutique est sélectionnée : carte centrée dessus, marker ouvert avec nom/adresse/itinéraire.
   - Sinon : toutes les boutiques en markers, `fitBounds` sur l'ensemble.
   - Lien "Voir la page complète des boutiques" → `/boutiques`.

3. Le bloc respecte le système d'espacement (`sectionPy`, `titleMb`) et le design "Industrial Luxury" (HUD, chamfer, hud-text, semantic tokens — pas de couleurs en dur).

## Détails techniques

- Nouveau composant `src/components/home/StoreFinderSection.tsx` :
  - Utilise `useBoutiques()` pour la liste.
  - État local : `query`, `userPos`, `selectedId`, `open` (dialog), `viewAll` (toutes vs. une).
  - Helper `haversineKm` (copié depuis `StoreLocator.tsx`).
  - Loader Google Maps réutilisé (extrait en util partagé : `src/lib/loadGoogleMaps.ts` pour éviter la duplication entre `Boutiques.tsx`, `StoreLocator.tsx`, et la nouvelle section).
  - Suggestions affichées sous l'input quand `query` non vide (max 5).
  - Bouton `Voir toutes les boutiques` ouvre le dialog en mode "toutes".
  - Bouton sur une suggestion ouvre le dialog centré sur la boutique.
- Nouvelle entrée dans le système de blocs de la home :
  - Ajouter `{ id: "storeFinder", visible: true }` au `DEFAULT_BLOCKS` dans `src/pages/Home.tsx`, placé juste après `categories`.
  - Ajouter un renderer `storeFinder: () => <StoreFinderSection />` dans `blockRenderers`.
  - Mettre à jour `src/components/admin/HomeBlocksEditor.tsx` pour reconnaître l'ID `storeFinder` (label "Nos boutiques") afin qu'il puisse être réordonné/masqué depuis l'admin.
  - Export depuis `src/components/home/index.ts`.

## Fichiers modifiés / créés

- `src/lib/loadGoogleMaps.ts` (nouveau, util partagé)
- `src/components/home/StoreFinderSection.tsx` (nouveau)
- `src/components/home/index.ts` (export)
- `src/pages/Home.tsx` (ajout du bloc + renderer)
- `src/components/admin/HomeBlocksEditor.tsx` (label du nouveau bloc)

## Hors-scope

- Pas de modif backend ni du schéma `boutiques`.
- Pas de changement sur les pages existantes `/boutiques` et `/store-locator`.
- Pas de logique métier nouvelle (réutilisation de `useBoutiques`, `haversineKm`, et du loader Google Maps).
