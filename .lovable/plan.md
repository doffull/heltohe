# Refonte de l'Éditeur Live (Elementor-like)

## Objectifs

1. **Parité mobile/desktop** : l'ordre, la visibilité et le contenu des sections de la page d'accueil sont strictement identiques sur les deux vues.
2. **Édition en un clic** depuis le site lui-même (mode super-admin), comme Elementor : texte, image, bouton, section.
3. **Refonte complète** du bouton/éditeur Live actuel — il devient le centre de contrôle inline du site.

---

## Partie 1 — Parité Mobile / Desktop

**Diagnostic** : `Home.tsx` lit déjà un seul `homePageBlocks` partagé. Le problème vient de deux endroits :
- `HomeBlocksEditor` n'écrit dans `homePageBlocks` qu'au `Save` global (ou via un event `homeicons:collect`). Sur mobile, le panneau Live a son propre tab "Sections" (`SectionsEditorTab`) qui écrit dans une **autre clé** : `homeSections` (jamais lue par `Home.tsx`).
- Résultat : sur desktop on règle via `/admin` → `homePageBlocks` (utilisé), sur mobile via l'éditeur Live → `homeSections` (ignoré).

**Correctif** :
- `SectionsEditorTab` (et tous les contrôles de l'éditeur Live) écrivent désormais directement dans `designSettings.homePageBlocks` — la **même clé** que l'admin desktop.
- Suppression de la clé legacy `homeSections` du flux (migration douce : si présente au load, on la convertit une fois en `homePageBlocks`).
- Verrouillage : un seul render path dans `Home.tsx` pour mobile et desktop — pas de branchement `isMobile` sur l'ordre ni la visibilité.

---

## Partie 2 — Éditeur Live "Elementor-like"

### 2.1 Nouveau bouton Live (toggle)

Remplace `VisualEditorToggle` actuel. Visible **uniquement** pour les super-admins (vérifié via `useUserRoles`). Trois états :
- **OFF** : pastille discrète en bas-gauche (icône crayon).
- **ON / Sélection** : barre flottante latérale fine + overlay sur la page.
- **ON / Édition** : popover contextuelle attachée à l'élément cliqué.

### 2.2 Sélection au clic

Wrapper `<EditableZone kind="..." targetId="..." />` ajouté autour de chaque élément éditable. Quand l'éditeur est ON :
- Hover → outline pointillé + label flottant (« Texte », « Image », « Section catégorie », « Bouton CTA »...).
- Clic → l'élément est sélectionné, une **mini-toolbar contextuelle** apparaît collée à l'élément, avec uniquement les actions pertinentes à son type.

### 2.3 Types d'éléments éditables et actions disponibles

| Type | Cibles | Actions inline |
|---|---|---|
| Texte | titres de section, sous-titres, labels (« Catégories », « Top ventes », « Découvrir »...) | Édition directe (contenteditable), gras / italique, taille, couleur (depuis tokens) |
| Image | hero slides, catégories, bannières | Remplacer (ouvre `MediaLibrary`), recadrer (position cover), alt, lien |
| Bouton / CTA | boutons des hero slides, CTA promo | Libellé, URL, variante (default/outline/ghost), icône |
| Section (bloc home) | tous les blocs de `homePageBlocks` | Monter / Descendre / Masquer / Dupliquer / Supprimer — au survol de la section, 4 boutons flottants apparaissent en haut-droite |

### 2.4 Réordonnancement des sections in-situ

- Au survol d'une section, une barre flottante apparaît : ↑ ↓ 👁 🗑 ⚙.
- ↑ et ↓ déplacent la section dans `homePageBlocks` immédiatement (animation framer-motion).
- ⚙ ouvre les réglages spécifiques au bloc (réutilise les composants existants : `CategoriesBlockInlineEditor`, `TechwearHeroTab`, etc.).
- Tout est répercuté sur mobile **et** desktop puisqu'on écrit dans la même clé.

### 2.5 Édition de texte inline

- Utilise et étend `InlineEditable` (déjà présent) pour devenir le mécanisme par défaut.
- Cible : `data-edit-key` automatique sur tout texte rendu via le wrapper.
- Sauvegarde dans `designSettings` (clés dédiées par bloc, ex. `categoriesTitle`, `featuredTitle`...) — ces clés sont lues côté rendu avec fallback aux valeurs actuelles.

### 2.6 Édition d'image inline

- Composant `EditableImage` qui, en mode éditeur, affiche un overlay « Changer l'image » au hover.
- Clic → ouverture d'un Dialog avec `MediaLibrary` existante (`useMediaLibrary`) + onglet Upload.
- Sauvegarde dans la bonne clé du bloc concerné (catégorie, slide hero, etc.).

### 2.7 Panneau latéral repensé

Le panneau gauche (`VisualEditorPanel`) devient secondaire — il ne s'ouvre **que** quand on veut un réglage global qui ne s'attache pas à un élément :
- **Pages** : sélecteur de page éditée (Home, Boutique, etc.).
- **Thème** : couleurs (tokens HSL), typo, espacement, rayons (importé depuis `AdminDesign`).
- **Header / Footer** : édition rapide (réutilise `HeaderDesignTab`).
- **Historique** : undo/redo des modifs locales avant Save.
- **Bouton Sauvegarder** persistant en haut, badge orange si dirty.

### 2.8 Sauvegarde

- Modifs en local (debounce 400ms) → preview live immédiate.
- Bouton **Sauvegarder** explicite déclenche `flushDesignSettings` (existant).
- Toast de confirmation + invalidation queries.

---

## Hors-scope

- Pas de drag-n-drop libre type "déposer un widget n'importe où" — on garde une liste ordonnée de blocs (cohérent avec l'architecture actuelle).
- Pas de nouveaux blocs créés à la volée depuis l'éditeur Live (ça reste dans `/admin` via `HomeCustomSectionsEditor`). L'éditeur Live se contente d'ordonner / masquer / configurer.
- Pages autres que la Home : seules les pages déjà gérées par `homePageBlocks` sont éditables au cycle 1. Les pages produit/checkout n'auront que l'édition de texte/image, pas de réordonnancement.
- Pas de gestion multi-utilisateurs simultanés.

---

## Fichiers principaux touchés

**Nouveaux**
- `src/components/visual-editor/EditableZone.tsx` — wrapper de sélection.
- `src/components/visual-editor/EditableImage.tsx` — image éditable + Dialog MediaLibrary.
- `src/components/visual-editor/InlineToolbar.tsx` — toolbar contextuelle (texte/image/bouton).
- `src/components/visual-editor/SectionControls.tsx` — boutons flottants ↑ ↓ 👁 🗑 ⚙ par section.
- `src/components/visual-editor/EditorBlockSettings.tsx` — popover de réglages bloc (réutilise composants admin existants).
- `src/hooks/useEditableSetting.ts` — get/set typé pour clés `designSettings`.

**Modifiés**
- `src/components/visual-editor/VisualEditorProvider.tsx` — ajoute selectedKey, history, kind, role-gating.
- `src/components/visual-editor/VisualEditorToggle.tsx` — refonte UI, gating super-admin.
- `src/components/visual-editor/VisualEditorPanel.tsx` — recentré sur réglages globaux + onglet Pages.
- `src/components/visual-editor/tabs/SectionsEditorTab.tsx` — écrit dans `homePageBlocks` (parité mobile/desktop), supprime `homeSections`.
- `src/pages/Home.tsx` — enrobe titres/images/boutons/blocs dans `EditableZone` + `InlineEditable` + `EditableImage`. Aucun branchement `isMobile` sur l'ordre des blocs.
- `src/components/home/CategoryGrid.tsx`, `HeroSlider.tsx`, `LoyaltyBanner.tsx`, `StoreFinderSection.tsx` — passes textes/images via les wrappers.

---

## Critères d'acceptation

1. Sur mobile 360px et desktop 1440px, l'ordre des blocs et leur visibilité sont **strictement identiques** après toute modification.
2. En mode super-admin éditeur ON, je peux cliquer sur le titre « Catégories » et le modifier en ligne sans naviguer vers /admin.
3. Je peux cliquer sur une image de catégorie et la remplacer via la médiathèque.
4. Je peux survoler une section et la monter/descendre/masquer en un clic ; le rendu se met à jour sur les deux viewports.
5. Le bouton Live n'apparaît pas pour les visiteurs non super-admin.
6. Un bouton Sauvegarder explicite persiste tous les changements.
