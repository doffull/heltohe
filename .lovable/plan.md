
# Activation complete de la Sidebar + Corrections UX

## 1. Suppression de l'overlay blanc de la sidebar

Le fichier `src/index.css` (classe `.sidebar-left-panel`) applique un fond `rgba(255, 255, 255, 0.15)` avec `backdrop-filter: blur(...)`. Ces proprietes seront supprimees pour obtenir un fond transparent sans effet de verre.

**Fichier :** `src/index.css` (lignes 316-319)
- `background-color: rgba(255, 255, 255, 0.15)` sera remplace par `background-color: transparent`
- `backdrop-filter` et `-webkit-backdrop-filter` seront supprimes
- `border-right` sera rendu transparent egalement

## 2. Boutons HUD sur la sidebar (configurables dans l'admin)

Les `hudButtons` existent deja dans les types et les donnees initiales mais ne sont pas affiches ni configurables.

**Fichier :** `src/components/layout/SidebarProductHUD.tsx`
- Ajout d'une section "Boutons HUD" qui lit `designSettings.hudButtons` et les affiche sur la sidebar
- Chaque bouton sera rendu avec son label, sa couleur de fond, et sera cliquable (navigation vers `button.url`)
- Position relative dans la sidebar (pas de positionnement absolu complexe)

**Fichier :** `src/pages/admin/AdminDesign.tsx` (onglet Sidebar)
- Ajout d'une carte "Boutons de la sidebar" avec :
  - Liste des boutons existants (label, URL, couleur de fond, couleur de texte)
  - Bouton "Ajouter" pour creer un nouveau bouton
  - Bouton "Supprimer" pour chaque bouton
  - Champs editables : label, URL, couleur de fond, couleur de texte

## 3. Activation des tailles sur la sidebar

Les tailles sont deja codees dans `SidebarProductHUD.tsx` et le toggle existe dans l'admin. Elles seront activees par defaut et affichees de maniere plus visible (toutes les tailles du produit actif).

Pas de modification majeure -- verification que `showSidebarSizes` est bien `true` par defaut (deja le cas dans `initialData.ts`).

## 4. Controle de la transparence des images du hero slider

**Fichier :** `src/types/index.ts`
- Ajout d'un champ `sliderImageOpacity: number` (0 a 1, defaut 1) dans `DesignSettings`

**Fichier :** `src/data/initialData.ts`
- Valeur par defaut : `sliderImageOpacity: 1`

**Fichier :** `src/pages/Home.tsx`
- Application de `opacity: designSettings.sliderImageOpacity` sur les couches d'images du hero

**Fichier :** `src/pages/admin/AdminDesign.tsx` (onglet Hero Slider)
- Ajout d'un slider "Opacite des images" (0% a 100%)

## 5. Scroll to top lors de la navigation vers les categories

**Fichier :** `src/App.tsx`
- Ajout d'un composant `ScrollToTop` qui ecoute les changements de `location` via `useLocation()` et appelle `window.scrollTo(0, 0)` a chaque navigation
- Place a l'interieur du `BrowserRouter`

## Details techniques - Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/index.css` | Suppression overlay blanc sidebar-left-panel |
| `src/components/layout/SidebarProductHUD.tsx` | Ajout rendu des hudButtons |
| `src/pages/admin/AdminDesign.tsx` | Section admin boutons sidebar + slider opacite hero |
| `src/types/index.ts` | Ajout `sliderImageOpacity` |
| `src/data/initialData.ts` | Valeur par defaut `sliderImageOpacity: 1` |
| `src/pages/Home.tsx` | Application opacite sur images hero |
| `src/App.tsx` | Composant ScrollToTop pour scroll en haut a chaque navigation |
