## Problèmes identifiés

**1. Les sections personnalisées (Icônes flottantes → "Sections personnalisées de la page d'accueil") ne se sauvegardent pas**

L'éditeur (`HomeCustomSectionsEditor.tsx`) actuel n'enregistre **que lorsque l'on clique manuellement sur "Enregistrer"** en haut à droite. Toute section ajoutée puis l'utilisateur qui change d'onglet/page = perte du travail. C'est ce qui donne l'impression "ça ne se sauve pas / n'apparaît pas sur la home".

**2. Pas de type de section "bannière publicitaire cliquable" avec image OU vidéo + lien**

Le PageBuilder a `image`, `video`, `slider`, mais aucun ne combine *média (image ou vidéo) + bouton/lien cliquable + redirection* en un seul bloc orienté "bannière pub".

## Plan

### A. Fiabiliser la sauvegarde des sections personnalisées

Dans `src/components/admin/HomeCustomSectionsEditor.tsx` :

- **Auto-save avec debounce 800 ms** dès qu'une section est ajoutée/modifiée/supprimée (via `setSections` → `updateDesignSettings` + `flushDesignSettings`).
- Indicateur visuel **"Modifications non enregistrées" / "Enregistré ✓"** à côté du bouton.
- Conserver le bouton "Enregistrer" manuel comme filet de sécurité.
- Toast unique "Sections enregistrées" après chaque flush réussi (throttlé pour éviter le spam).
- Garde-fou : si `sections` est strictement égal au dernier état persisté, ne pas re-flush.

### B. Nouveau type de section : `banner` (bannière pub cliquable)

Dans `src/hooks/usePages.ts` :
- Ajouter `'banner'` à l'union `PageSection['type']`.

Dans `src/components/admin/PageBuilder.tsx` (`SECTION_TYPES` + nouveau `BannerEditor`) :

Champs configurables :
- **Type de média** : `image` ou `video` (radio).
- **Upload média** via `FileDropZone` (réutilise l'existant) → stocke `mediaUrl`.
- **URL de redirection** (`link`) — interne (`/boutique`) ou externe (`https://…`).
- **Ouvrir dans un nouvel onglet** (switch, défaut OFF pour les liens internes).
- **Titre overlay** + **Sous-titre** (optionnels).
- **Texte du bouton** (optionnel — si vide, toute la bannière est cliquable).
- **Position du texte** : haut-gauche, centre, bas-droite, etc. (9 ancres).
- **Couleur du texte** + **opacité du voile noir** (slider 0-80 %).
- **Hauteur** : auto / 240 / 360 / 480 / 600 px.
- **Effet hover** (réutilise `HOVER_EFFECTS` existant).
- **Parallax** (switch + speed slider, réutilise `useParallax`).
- **Vidéo** : autoplay / muted / loop / controls (switches, défauts autoplay+muted+loop ON, controls OFF pour effet bannière).
- **Tracking simple** : un attribut `data-banner-id` sur le lien pour permettre du tracking ultérieur (pas de logique analytics dans ce lot).

### C. Rendu public dans `src/components/page/PageRenderer.tsx`

Ajouter un composant `BannerSection` :
- Wrapper `<a href={link} target={newTab ? '_blank' : '_self'} rel="noopener noreferrer">` (ou `<Link>` interne si `link` commence par `/`).
- Rendu image via `SafeImage` ou vidéo via `SafeVideo` (existants dans `src/lib/safeMedia.tsx`) — pas de réimplémentation.
- Overlay absolu avec voile + titre/sous-titre/bouton positionnés selon les 9 ancres.
- Application des classes hover (`HOVER_CLASSES`) + parallax (`useParallax`) comme pour `ImageSection`.
- Si pas de `link` → rendu en `<div>` non cliquable (fallback safe).
- Lazy loading : `loading="lazy"` image / `preload="metadata"` vidéo.

### D. Hors scope

- Pas de nouvelle table DB : les bannières utilisent le JSON `design_settings.home_custom_sections` existant.
- Pas de tracking / analytics côté serveur (juste l'attribut `data-banner-id` préparé).
- Pas de toucher aux FABs (icônes flottantes), au système `banners` existant (qui est un autre flux), ni au `PageRenderer` des autres types de section.

## Fichiers modifiés

- `src/components/admin/HomeCustomSectionsEditor.tsx` — auto-save + indicateur.
- `src/hooks/usePages.ts` — type union étendu.
- `src/components/admin/PageBuilder.tsx` — ajout `banner` dans `SECTION_TYPES` + `BannerEditor`.
- `src/components/page/PageRenderer.tsx` — nouveau `BannerSection`.
