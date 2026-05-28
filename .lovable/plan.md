## Objectif

Améliorer le PageBuilder utilisé dans « Sections personnalisées de la page d'accueil » (visible sur `/admin/home-icons`) :

1. Rendre l'édition d'une section **pliable/dépliable** avec un bouton « Modifier » explicite et **remplacer le `Trash2` actuel par une vraie confirmation** (AlertDialog) avant suppression.
2. Ajouter des options visuelles **parallax** et **effets au survol** sur les sections `image` et `slider`, appliquées côté rendu public.

## Détails admin — `src/components/admin/PageBuilder.tsx`

- Ajouter un état `collapsed` par section. En-tête (toujours visible) : drag handle, icône type, libellé, **titre court** (extrait de `content.title` / `content.text` / `content.alt`), boutons :
  - `ChevronUp` / `ChevronDown` (ordre, inchangés)
  - **Modifier** (`Pencil`) → toggle `collapsed`
  - **Supprimer** (`Trash2`) → ouvre `AlertDialog` (`shadcn/ui`) « Supprimer cette section ? Cette action est définitive. » avec Annuler / Supprimer.
- Le corps de l'éditeur n'est rendu que si `!collapsed` (par défaut **plié** pour les sections existantes, **déplié** pour une section nouvellement ajoutée).
- Dans le bloc `section.type === 'image'`, ajouter sous le `FileDropZone` :
  - Select « Effet au survol » : `none`, `zoom`, `zoom-out`, `tilt`, `brightness`, `grayscale-off` → stocké dans `content.hoverEffect`.
  - Switch « Parallax au scroll » → `content.parallax` (bool) + Slider « Intensité » 0.1–0.6 → `content.parallaxSpeed` (défaut 0.25).
  - Select « Taille » (small/medium/full) déjà implicite, conserver.
- Dans le bloc `section.type === 'slider'`, ajouter le même Select « Effet au survol » appliqué à chaque image.

## Détails rendu — `src/components/page/PageRenderer.tsx`

- `ImageSection` :
  - Si `content.parallax`, envelopper l'`<img>` avec un wrapper utilisant le hook existant `useParallax(content.parallaxSpeed)` (overflow-hidden + translateY via `style`).
  - Mapper `content.hoverEffect` vers des classes Tailwind appliquées à l'`<img>` (ajouter `transition-all duration-500`) :
    - `zoom` → `hover:scale-110`
    - `zoom-out` → `scale-110 hover:scale-100`
    - `tilt` → `hover:rotate-1 hover:scale-105`
    - `brightness` → `hover:brightness-110`
    - `grayscale-off` → `grayscale hover:grayscale-0`
  - Wrapper `group overflow-hidden` autour de l'image pour activer `group-hover:` si besoin.
- `SliderSection` : même mapping appliqué à chaque `<img>`.

## Hors scope

Pas de changement des autres types de sections (hero, video, products, categories, popup_button), ni du composant des boutons flottants (`AdminHomeIcons` lui-même — ses boutons ont déjà édition + suppression). Pas de migration DB (stocké dans `pages.sections` / `design_settings.homeCustomSections` JSON).
