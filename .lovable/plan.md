
# Plan : Delai sidebar configurable, menu compact hamburger, espaces blancs, presets sidebar/hero/global

---

## 1. Delai d'apparition de la sidebar configurable

### Fichier : `src/pages/admin/AdminDesign.tsx` (SidebarTab)
- Ajouter un slider "Delai d'apparition" (1s a 30s, par defaut 10s) dans la section Sidebar.
- Stocker la valeur dans `designSettings.sidebarDelay` (en millisecondes).

### Fichier : `src/types/index.ts`
- Ajouter `sidebarDelay?: number;` dans `DesignSettings`.

### Fichier : `src/components/layout/MainLayout.tsx`
- Remplacer le `10000` code en dur par `designSettings.sidebarDelay || 10000`.

---

## 2. Menu compact (preset "Minimal") : menu hamburger avec toutes les categories

### Probleme actuel
Quand on choisit le preset "Minimal", la nav est cachee (`hidden`) mais il n'y a pas de menu hamburger visible sur desktop. Le burger n'apparait que sur mobile (`lg:hidden`).

### Fichier : `src/components/layout/MainLayout.tsx`
- Quand `headerPreset === 'minimal'`, afficher un bouton hamburger sur desktop aussi (retirer la contrainte `lg:hidden` du `<Sheet>` burger).
- Dans le menu hamburger ouvert, lister toutes les categories + liens systeme.
- Repositionner : logo a gauche, boutons d'action (panier, compte, etc.) au centre-gauche, burger a droite.

---

## 3. Hero parallaxe colle au header (supprimer l'espace)

### Fichier : `src/pages/Home.tsx`
- Le hero a deja `h-[100vh]` mais le `<main>` dans `MainLayout.tsx` a un `pt-16 lg:pt-20` qui cree un espace entre le header et le contenu.
- Pour la page d'accueil, utiliser `pt-0` au lieu de `pt-16 lg:pt-20` car le hero est en `h-[100vh]` et se place naturellement sous le header fixe.

### Fichier : `src/components/layout/MainLayout.tsx`
- Conditionner le padding-top du `<main>` : `isHomePage ? "pt-0" : "pt-16 lg:pt-20"`.

---

## 4. Supprimer les espaces blancs restants entre sections

### Fichier : `src/pages/Home.tsx`
- Categories : `py-4 lg:py-16` -> `py-2 lg:py-8`
- En vedette : `py-4 lg:py-16` -> `py-2 lg:py-8`
- Nouveautes : `py-4 lg:py-16` -> `py-2 lg:py-8`
- Newsletter : `py-6 lg:py-16` -> `py-4 lg:py-10`
- Titres marges : `mb-4 lg:mb-8` -> `mb-3 lg:mb-6`
- `mt-6 lg:mt-12` (bouton voir collection) -> `mt-4 lg:mt-8`

---

## 5. Presets supplementaires pour la sidebar

### Fichier : `src/pages/admin/AdminDesign.tsx` (SidebarTab)
Ajouter des presets supplementaires :
- **Classique** (existant) : Image + carte produit + hotspots
- **Minimal** (existant) : Image seule
- **Catalogue** (existant) : Grille de produits
- **Parallaxe** (nouveau) : Image avec effet parallaxe fixe (background-attachment: fixed), hotspots animes
- **Vitrine** (nouveau) : Image + overlay gradient + texte central promo
- **Sombre** (nouveau) : Fond sombre uni + stats + boutons CTA uniquement

---

## 6. Presets supplementaires pour le Hero Slider

### Fichier : `src/pages/admin/AdminDesign.tsx` (HeroSliderTab)
Les presets actuels (Plein ecran, Demi-ecran, Banniere) n'appliquent aucune valeur -- ils font juste un toast. Les corriger pour qu'ils appliquent reellement des parametres :
- **Plein ecran** : `sliderHeight: '100vh'`, overlay off
- **Demi-ecran** : `sliderHeight: '60vh'`, overlay on, texte centre
- **Banniere** : `sliderHeight: '40vh'`, compact
- **Cinematique** (nouveau) : `sliderHeight: '80vh'`, grayscale on, overlay on, vitesse lente (10s)
- **Minimal** (nouveau) : `sliderHeight: '50vh'`, pas de texte, juste image

Stocker `sliderHeight` dans designSettings.

---

## 7. Presets de disposition globale du site (nouvelle section)

### Fichier : `src/pages/admin/AdminDesign.tsx`
Ajouter un nouvel onglet "Disposition" (ou "Global") dans les tabs :

- **Luxe industriel** (actuel par defaut) : Hero 100vh, sidebar visible, categories 4 colonnes portrait, header classique, espacement compact
- **Boutique epuree** : Hero 60vh, pas de sidebar, categories 2 colonnes larges, header centred, espacement normal
- **Vitrine minimaliste** : Hero 100vh, sidebar minimal, categories banniere 16:9, header minimal, tout compact
- **Catalogue dense** : Hero banniere 40vh, pas de sidebar, categories compact 4/3, header fullwidth, pas d'espacement

Chaque preset applique en un clic : `headerPreset`, `categoryLayout`, `sliderHeight`, et un flag global `siteSpacing` ('compact' | 'normal' | 'spacious').

### Fichier : `src/types/index.ts`
- Ajouter `sliderHeight?: string;` et `siteSpacing?: string;` dans `DesignSettings`.

### Fichier : `src/pages/Home.tsx`
- Lire `siteSpacing` pour appliquer dynamiquement les paddings des sections :
  - `compact` : py-1 lg:py-4
  - `normal` : py-4 lg:py-10
  - `spacious` : py-8 lg:py-20
- Lire `sliderHeight` pour le hero : `h-[${sliderHeight}]` au lieu de `h-[100vh]` code en dur.

---

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/types/index.ts` | Ajout `sidebarDelay`, `sliderHeight`, `siteSpacing` |
| `src/components/layout/MainLayout.tsx` | Delai sidebar dynamique, pt-0 sur accueil, burger desktop pour preset minimal |
| `src/pages/Home.tsx` | Espacement dynamique via `siteSpacing`, hauteur hero via `sliderHeight`, reduction des espaces |
| `src/pages/admin/AdminDesign.tsx` | Presets sidebar (3 nouveaux), presets hero fonctionnels (2 nouveaux), slider delai sidebar, nouvel onglet "Disposition" avec presets globaux |

---

## Ordre d'implementation

1. Types (sidebarDelay, sliderHeight, siteSpacing)
2. MainLayout (delai dynamique, pt-0 accueil, burger desktop minimal)
3. Home.tsx (espacement dynamique, hauteur hero dynamique)
4. AdminDesign (slider delai, presets sidebar, presets hero fonctionnels, onglet disposition globale)
