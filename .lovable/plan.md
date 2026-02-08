
# Synchronisation Admin Design -- Site Public

## Probleme identifie

Les modifications faites dans `/admin/design` sont bien sauvegardees dans le contexte `AppContext` (et localStorage), mais la page d'accueil et le layout **n'utilisent pas ces donnees**. Voici les deconnexions :

1. **Hero Slider** : `Home.tsx` utilise un tableau `HERO_SLIDES` code en dur (images statiques importees depuis `/src/assets/`). Les slides configurees dans l'admin ne sont jamais lues.
2. **Stats de la sidebar** : `MainLayout.tsx` utilise soit le `SidebarContext` soit un tableau `DEFAULT_STATS` code en dur. Les stats configurees dans l'admin sont ignorees.
3. **Logo** : Le header affiche le texte "Helvetica-MP" en dur. Le logo uploade dans l'admin n'est pas utilise dans le header.

## Ce qui sera corrige

### 1. Hero Slider sur la page d'accueil (`src/pages/Home.tsx`)

- Importer `useApp` et lire `designSettings.heroSlides`
- Si des slides sont configurees dans l'admin (URL non vide), les utiliser pour le hero
- Sinon, conserver les slides par defaut comme fallback
- Appliquer le parallax multi-couches (backgroundMedia, midgroundMedia, foregroundMedia) comme dans le composant `HeroSlider.tsx`
- Respecter les parametres `sliderAutoPlay`, `sliderSpeed`, `sliderGrayscale`, `showSliderOverlay`

### 2. Stats de la sidebar (`src/components/layout/MainLayout.tsx`)

- Lire `designSettings.stats` depuis `useApp()` (deja importe)
- Utiliser ces stats comme source de verite au lieu de `DEFAULT_STATS` et `SidebarContext`
- Si `designSettings.stats` est vide, utiliser les valeurs par defaut

### 3. Logo dans le header (`src/components/layout/MainLayout.tsx`)

- Si `designSettings.hudLogo` contient une URL, afficher une balise `<img>` avec ce logo dans le header (a la place du texte "Helvetica-MP")
- Si `designSettings.showLogo` est false, masquer le logo
- Conserver le texte "Helvetica-MP" comme fallback si aucun logo n'est configure

### 4. Image sidebar (deja fonctionnel)

L'image du mannequin lit deja `designSettings.sidebarImage` -- pas de changement necessaire.

## Details techniques

### Fichiers modifies

**`src/pages/Home.tsx`**
- Ajout de `useApp` pour recuperer `designSettings`
- Remplacement de la constante `HERO_SLIDES` par une logique qui :
  - Verifie si `designSettings.heroSlides` contient des slides avec des medias valides (URL non vide)
  - Si oui, utilise ces slides (titre, sous-titre, CTA, 3 couches parallax)
  - Si non, utilise les slides par defaut existantes
- Adaptation du rendu hero pour supporter les 3 couches parallax quand disponibles
- Prise en compte de `sliderSpeed` pour le timer auto-play

**`src/components/layout/MainLayout.tsx`**
- Remplacement de la logique stats (lignes 74-81) pour utiliser `designSettings.stats` en priorite
- Modification du bloc logo (lignes 87-91) pour afficher l'image uploadee si disponible
- Suppression de `DEFAULT_STATS` devenu inutile

### Logique de fallback

```text
Hero Slides:
  designSettings.heroSlides (avec media non vide) ?
    -> OUI : utiliser les slides de l'admin
    -> NON : utiliser HERO_SLIDES par defaut (images statiques)

Stats:
  designSettings.stats (tableau non vide) ?
    -> OUI : utiliser les stats de l'admin
    -> NON : utiliser DEFAULT_STATS

Logo:
  designSettings.hudLogo (URL non vide) ?
    -> OUI : afficher <img src={hudLogo} />
    -> NON : afficher texte "Helvetica-MP"
```
