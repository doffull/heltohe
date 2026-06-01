## Objectif

Compléter l'éditeur Live avec 4 fonctions manquantes et garantir la **synchronisation bidirectionnelle** de l'ordre des sections entre la home et `/admin/home-icons`.

---

## 1. Sync sections Home ↔ Admin "Icône Accueil"

**Problème actuel** : la Live Editor écrit dans `designSettings.homePageBlocks` (en mémoire) et persiste seulement au clic « Sauvegarder » du panneau. Côté admin, `HomeBlocksEditor` utilise un state local avec un `dirtyRef` qui bloque la resynchronisation. Résultat : les ordres peuvent diverger.

**Correctif** :
- `SectionsEditorTab` (Live Editor) → appeler `flushDesignSettings({ homePageBlocks })` à chaque drag/toggle (debounce 400 ms) pour persister immédiatement.
- `HomeBlocksEditor` (admin) → réécouter le store quand on entre/sort de la page (reset `dirtyRef` au mount, et re-sync si la version serveur est plus récente que la version locale).
- Ajouter un petit indicateur « synchronisé » dans les deux UI.

## 2. Édition d'image inline via la médiathèque

- Nouveau composant `EditableImage.tsx` (visual-editor) : wrapper qui détecte mode édition admin et superpose un bouton « Changer l'image » → ouvre `MediaLibraryDialog`.
- Nouveau composant `MediaLibraryDialog.tsx` : grille des médias (`useMediaLibrary`), upload (`useUploadMedia`), filtrage image/vidéo, sélection avec callback `onSelect(url)`.
- Intégration sur : `HeroSlider` (slides), `CategoryGrid` (visuels catégories home), `StoreFinderSection` (illustration), `PromoBanner`, `LoyaltyBanner`.
- Toute modification écrit dans le bon nœud de `designSettings` (clé typée via `useEditableSetting`).

## 3. Édition des CTA hero

- Nouvel onglet `HeroCtaEditorTab` dans le panneau Live (ou sous-section de `HeroEditorTab`) :
  - Liste des slides → pour chaque slide : libellé CTA, URL/route, variante visuelle (glossy/glass/neon/outline), visibilité, secondary CTA optionnel.
  - Réordonnancement par drag, ajout/suppression.
- Sur la home, wrapper inline `<EditableCta>` autour des boutons hero → clic en mode édition ouvre une popover avec label + lien.
- Persisté dans `designSettings.heroSlides[i].cta` (déjà existant) — pas de migration DB.

## 4. Panneau latéral refondu — multi-pages

- Nouveau `VisualEditorPanel` refondu avec un **sélecteur de page en haut** : Accueil / Boutique / Pages personnalisées (via `usePages`) / Légal.
- Le contenu des onglets s'adapte à la page sélectionnée :
  - Accueil : onglets actuels (Hero, Couleurs, Sections, Layout, Hero CTA).
  - Boutique : tri, filtres visibles, grille.
  - Pages custom : liste sections + édition inline via `PageRenderer`.
- `VisualEditorProvider` : ajouter `currentPageKey` + helper `setCurrentPageKey`.
- Navigation auto : changer de page dans le sélecteur → `navigate(routeMap[pageKey])` pour que la prévisualisation suive.

## 5. Undo / Redo

- Nouveau hook `useDesignHistory.ts` : pile `past[] / present / future[]` (limite 50 entrées) qui observe les mutations de `designSettings`.
- Boutons « Annuler » (↶) et « Rétablir » (↷) dans le header du panneau.
- Raccourcis clavier : `Cmd/Ctrl+Z` et `Cmd/Ctrl+Shift+Z` (actifs uniquement si le panneau est ouvert).
- Indicateur visuel du nombre d'actions annulables.

---

## Détails techniques

**Fichiers créés** (7) :
- `src/components/visual-editor/EditableImage.tsx`
- `src/components/visual-editor/MediaLibraryDialog.tsx`
- `src/components/visual-editor/EditableCta.tsx`
- `src/components/visual-editor/tabs/HeroCtaEditorTab.tsx`
- `src/components/visual-editor/PageSwitcher.tsx`
- `src/hooks/useDesignHistory.ts`
- `src/hooks/useEditableSetting.ts`

**Fichiers modifiés** (8) :
- `src/components/visual-editor/VisualEditorPanel.tsx` (multi-pages + undo/redo header)
- `src/components/visual-editor/VisualEditorProvider.tsx` (currentPageKey, history)
- `src/components/visual-editor/tabs/SectionsEditorTab.tsx` (flush immédiat debounce)
- `src/components/admin/HomeBlocksEditor.tsx` (resync à chaque mount, indicateur sync)
- `src/components/home/HeroSlider.tsx` (wrap images + CTAs)
- `src/components/home/CategoryGrid.tsx` (wrap images)
- `src/components/home/StoreFinderSection.tsx` (wrap image)
- `src/pages/Home.tsx` (ajout EditableImage/Cta autour de PromoBanner/LoyaltyBanner si visible)

**Hors scope** :
- Pas de modification du schéma DB.
- Pas de drag-n-drop entre pages.
- Pas d'édition multi-utilisateur temps réel.
- Pas de nouveaux types de blocs.
