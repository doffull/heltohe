
## Éditeur visuel temps réel — Plan d'implémentation

### Concept
Un bouton flottant à gauche du site (visible uniquement pour les admins connectés) ouvre un panneau d'édition latéral qui permet de modifier directement le contenu de la page visible :
- **Textes** : titres, sous-titres, CTA du Hero
- **Couleurs** : accentColor, headerBgColor, headerTextColor
- **Images** : hero background, logo
- **Sections** : toggle visibilité des sections homepage
- **Disposition** : colonnes catégories, hauteur slider
- **Ajout de sections** : ajouter des sections produits à la page d'accueil

Tout changement est appliqué **immédiatement en temps réel** (via `updateDesignSettings` déjà dans AppContext) et sauvegardé avec un bouton Save dans le panneau.

### Architecture

```text
src/components/visual-editor/
  VisualEditorProvider.tsx   — contexte (isOpen, selectedElement, mode)
  VisualEditorToggle.tsx     — bouton flottant gauche (visible admins seulement)
  VisualEditorPanel.tsx      — panneau latéral gauche coulissant
  tabs/
    HeroEditorTab.tsx        — édition slides hero (titre, sous-titre, CTA, couleur accent)
    ColorsEditorTab.tsx      — couleurs globales (accent, header bg/text)
    SectionsEditorTab.tsx    — toggle sections homepage + ajout
    LayoutEditorTab.tsx      — hauteur slider, colonnes catégories, espacement
```

### Intégration dans App.tsx
Le `VisualEditorToggle` + `VisualEditorPanel` sont ajoutés dans `AppShell` (après AnimatedRoutes), enveloppés dans un `VisualEditorProvider`. Ils ne se montent que si `isAdmin === true`.

### Bouton flottant
- Position fixe : `left-4, top-1/2` — vertical centré, côté gauche
- Icône : `Pencil` ou `Wand2` de lucide-react
- Fond : `bg-primary text-primary-foreground` avec effet glow
- Badge "LIVE" animé quand le panneau est ouvert
- Z-index : `z-[80]` (au-dessus de tout sauf modales)

### Panneau (VisualEditorPanel)
- Largeur fixe : `w-80` (320px), slide depuis la gauche
- Fond : `bg-background border-r border-border`
- 4 onglets : **Hero** | **Couleurs** | **Sections** | **Disposition**
- Header du panneau avec : titre "Éditeur Live", badge vert "LIVE", bouton Sauvegarder + bouton Fermer

### Onglet Hero
- Liste des slides (accordéon léger)
- Par slide : Titre (`<input>`), Sous-titre (`<input>`), CTA text (`<input>`), Couleur accent (`<input type="color">`)
- Changements → `updateDesignSettings({ heroSlides: [...] })` → se reflète en temps réel sur le site

### Onglet Couleurs
- Couleur accent : `input[type=color]` → `updateDesignSettings({ accentColor })`
- Couleur fond header : `input[type=color]` → `updateDesignSettings({ headerBgColor })`
- Couleur texte header : `input[type=color]` → `updateDesignSettings({ headerTextColor })`
- Preset header rapide : 4 boutons (Classic / Transparent / Dark / Light)

### Onglet Sections
- Liste des `homeSections` avec toggle on/off par section
- Bouton "Ajouter une section" → modal simple (nom + tag produit)
- Changements → `updateDesignSettings({ homeSections })`

### Onglet Disposition
- Hauteur slider : select (50vh / 70vh / 85vh / 100vh)
- Colonnes catégories : slider 2–4
- Espacement site : select (compact / normal / spacious)

### Sauvegarde
- Bouton "💾 Sauvegarder" dans le header du panneau → `saveDesignSettings.mutate(designSettings)` avec toast confirmation
- Indicateur de modifications non sauvegardées (point orange)

### Fichiers à créer/modifier

| Fichier | Action |
|---|---|
| `src/components/visual-editor/VisualEditorProvider.tsx` | Nouveau — contexte open/close |
| `src/components/visual-editor/VisualEditorToggle.tsx` | Nouveau — bouton flottant |
| `src/components/visual-editor/VisualEditorPanel.tsx` | Nouveau — panneau principal |
| `src/components/visual-editor/tabs/HeroEditorTab.tsx` | Nouveau |
| `src/components/visual-editor/tabs/ColorsEditorTab.tsx` | Nouveau |
| `src/components/visual-editor/tabs/SectionsEditorTab.tsx` | Nouveau |
| `src/components/visual-editor/tabs/LayoutEditorTab.tsx` | Nouveau |
| `src/App.tsx` | Ajouter `VisualEditorProvider` + `VisualEditorToggle` + `VisualEditorPanel` dans AppShell |

Aucune modification de base de données requise — utilise `updateDesignSettings` + `useSaveDesignSettings` déjà en place.
