
# Ameliorations Sidebar, Hero et Header

## Problemes identifies

1. **Overlay sidebar** : L'image de fond de la sidebar a une `opacity: 0.4` (ligne 241 de MainLayout.tsx) qui cree un effet d'image "lavee". Il faut soit la passer a 1, soit ajouter un controle dans l'admin.
2. **Hero slide 2 transparence** : Le `sliderImageOpacity` est applique globalement a toutes les slides. Sa valeur par defaut est `1` mais si elle a ete changee en admin, toutes les images sont affectees. Il faut s'assurer que l'opacite est bien a 100% par defaut et que chaque slide peut avoir son opacite individuelle si besoin.
3. **Header deplace** : Le menu de navigation est dans le header avec `pl-[200px]` pour laisser la place au logo, mais il n'est plus centre correctement. Il faut remettre le menu dans la zone blanche du header, bien centre.
4. **Carte produit info editable** : Actuellement la carte produit affiche les infos du produit survole/selectionne. L'utilisateur veut pouvoir modifier les infos affichees dans la carte depuis l'admin.
5. **Selecteur de taille XS a XXXL** : L'utilisateur veut pouvoir configurer la liste des tailles disponibles dans l'admin Sidebar.
6. **Couleurs de la barre de statistiques** : Pouvoir changer la couleur des segments remplis et vides des stat bars.

## Modifications prevues

### 1. Suppression de l'overlay sidebar (opacite de l'image de fond)

**Fichier :** `src/components/layout/MainLayout.tsx` (ligne 241)
- Remplacer `opacity: 0.4` par une variable configurable depuis l'admin
- Ajouter un champ `sidebarImageOpacity` dans DesignSettings (defaut: `1`)

**Fichier :** `src/pages/admin/AdminDesign.tsx` (onglet Sidebar)
- Ajouter un slider "Opacite de l'image de fond" (0% a 100%) dans la section "Image du mannequin"
- Ajouter un toggle "Afficher l'overlay" avec option on/off

### 2. Opacite Hero Slider a 100% par defaut

**Fichier :** `src/pages/Home.tsx`
- Verifier que `designSettings.sliderImageOpacity ?? 1` est bien utilise (deja le cas)
- Le probleme est probablement que la valeur a ete changee dans l'admin. S'assurer que la valeur par defaut dans initialData est `1`.

### 3. Repositionnement du header

**Fichier :** `src/components/layout/MainLayout.tsx`
- La navigation est actuellement dans un `div` avec `pl-[200px]` et `justify-between`
- Remettre la navigation centree dans le header en utilisant `justify-center` pour la nav et en positionnant les actions a droite avec `ml-auto`
- Structure : `[espace logo 200px] [--- nav centree ---] [actions a droite]`

### 4. Configuration des tailles dans l'admin

**Fichier :** `src/types/index.ts`
- Ajout de `sidebarSizes: string[]` dans DesignSettings (defaut: `['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']`)

**Fichier :** `src/data/initialData.ts`
- Valeur par defaut : `sidebarSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']`

**Fichier :** `src/components/layout/SidebarProductHUD.tsx`
- Utiliser `designSettings.sidebarSizes` au lieu de `activeProduct?.sizes || ['S', 'M', 'L', 'XL']`

**Fichier :** `src/pages/admin/AdminDesign.tsx` (onglet Sidebar)
- Ajouter une section "Tailles affichees" avec des checkboxes pour chaque taille (XS, S, M, L, XL, XXL, XXXL)

### 5. Couleurs des barres de statistiques

**Fichier :** `src/types/index.ts`
- Ajout de `statBarFilledColor: string` et `statBarEmptyColor: string` dans DesignSettings

**Fichier :** `src/data/initialData.ts`
- Valeurs par defaut : `statBarFilledColor: '#000000'`, `statBarEmptyColor: '#e5e5e5'`

**Fichier :** `src/components/layout/StatBar.tsx`
- Lire les couleurs depuis `designSettings` via `useApp()` et les appliquer aux segments

**Fichier :** `src/pages/admin/AdminDesign.tsx` (onglet Sidebar, section Barres de statistiques)
- Ajouter deux selecteurs de couleur : "Couleur remplie" et "Couleur vide"

### 6. Carte produit info editable dans l'admin

**Fichier :** `src/types/index.ts`
- Ajout de `sidebarProductTitle: string` et `sidebarProductDescription: string` dans DesignSettings (valeurs par defaut vides = utilise les infos du produit actif)

**Fichier :** `src/pages/admin/AdminDesign.tsx`
- Ajouter des champs dans la section "Carte produit" : titre personnalise, description personnalisee (si vides, les infos du produit survole sont utilisees)

**Fichier :** `src/components/layout/SidebarProductHUD.tsx`
- Si `designSettings.sidebarProductTitle` est defini, l'afficher a la place de `activeProduct.name`
- Idem pour la description

### 7. Ajout du champ `sidebarImageOpacity` dans les types

**Fichier :** `src/types/index.ts`
- Ajout de `sidebarImageOpacity: number` (defaut 1)

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/types/index.ts` | Ajout `sidebarImageOpacity`, `sidebarSizes`, `statBarFilledColor`, `statBarEmptyColor`, `sidebarProductTitle`, `sidebarProductDescription` |
| `src/data/initialData.ts` | Valeurs par defaut pour les nouveaux champs |
| `src/components/layout/MainLayout.tsx` | Opacite image sidebar configurable + header repositionne |
| `src/components/layout/SidebarProductHUD.tsx` | Tailles depuis designSettings, titre/description personnalisables |
| `src/components/layout/StatBar.tsx` | Couleurs configurables |
| `src/pages/admin/AdminDesign.tsx` | Nouveaux controles : opacite image sidebar, tailles, couleurs stat bars, carte produit |
