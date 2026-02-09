
# Plan : Header Admin, Espacement compact, Sidebar animee, Upload produit, Sous-categories

---

## 1. Section "Header" dans l'admin avec presets

### Objectif
Ajouter un nouvel onglet/section dans la page AdminDesign (ou une nouvelle page admin dediee) permettant de modifier le header du site public avec des presets appliquables en un clic.

### Solution
- **Nouveau fichier** `src/components/admin/HeaderDesignTab.tsx` : composant avec une grille de presets visuels (miniatures) + personnalisation manuelle.
- **Presets disponibles** (5-6 variantes) :
  - **Classique** : Logo a gauche, nav au centre, icones a droite
  - **Centred** : Logo centre, nav en dessous
  - **Minimal** : Pas de nav visible, uniquement logo + icones (nav dans le menu burger)
  - **Full-width** : Nav etalee sur toute la largeur avec logo inline
  - **Transparent** : Header transparent qui se fond dans le hero
- **Stockage** : Ajouter un champ `headerPreset` (text, default 'classic') dans `design_settings` + champs optionnels `headerBgColor`, `headerTextColor`, `headerFixed` (boolean).
- **`MainLayout.tsx`** : Lire `designSettings.headerPreset` et appliquer conditionnellement les classes/structure CSS du header.
- **`types/index.ts`** : Ajouter `headerPreset`, `headerBgColor`, `headerTextColor`, `headerFixed` dans `DesignSettings`.
- **Integration** : Ajouter un onglet "Header" dans `AdminDesign.tsx`.

### Migration SQL
```sql
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS header_preset text DEFAULT 'classic';
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS header_bg_color text DEFAULT '';
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS header_text_color text DEFAULT '';
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS header_fixed boolean DEFAULT true;
```

---

## 2. Espacement compact entre sections (page d'accueil)

### Probleme
Malgre les corrections precedentes (`py-10 lg:py-28`), il reste trop d'espace blanc entre les sections sur la page d'accueil.

### Solution
- **`Home.tsx`** : Reduire encore les paddings mobile et desktop :
  - Categories : `py-10 lg:py-28` -> `py-4 lg:py-16`
  - Featured : `py-10 lg:py-28` -> `py-4 lg:py-16`
  - New Arrivals : `py-10 lg:py-28` -> `py-4 lg:py-16`
  - Newsletter : `py-12 lg:py-24` -> `py-6 lg:py-16`
  - Marges entre titres et grilles : `mb-6 lg:mb-12` -> `mb-4 lg:mb-8`
- **Footer** (`MainLayout.tsx`) : `mt-10` -> `mt-4 lg:mt-10`

---

## 3. Sidebar gauche avec effet de transition et bouton fermeture

### Probleme actuel
Sur desktop, la sidebar est toujours visible (fixe). L'utilisateur veut un effet d'apparition (slide-in) et un bouton croix pour la masquer, avec le hero qui prend toute la largeur quand elle est fermee.

### Solution
- **`MainLayout.tsx`** :
  - Ajouter un state `desktopSidebarOpen` (default `true`) qui controle la visibilite de la sidebar sur desktop aussi.
  - La sidebar arrive avec une animation CSS `transition-transform duration-500 ease-out`.
  - Ajouter un bouton croix (X) dans le coin superieur droit de la sidebar pour la fermer.
  - Ajouter un petit bouton (fleche ou icone PanelLeft) fixe en bas a gauche pour la rouvrir quand fermee.
  - Le `main` et le `footer` passent de `lg:ml-[35%]` a `lg:ml-0` quand la sidebar est fermee, avec `transition-all duration-500`.
- **Pas de modification du contenu** de la page d'accueil elle-meme -- seul le layout wrapper change.

---

## 4. Upload/Drag-and-Drop dans le formulaire produit

### Probleme
Le formulaire `ProductForm.tsx` utilise un simple champ `Input` pour l'URL de l'image et de la video. Il n'y a pas de drag-and-drop ni d'upload depuis l'ordinateur/mobile.

### Solution
- **`ProductForm.tsx`** : Remplacer les champs `Input` pour l'image et la video par le composant `FileDropZone` existant (qui fonctionne deja dans AdminDesign).
  - Image principale : `FileDropZone` avec `accept={['image']}` et `folder="products"`.
  - Video : `FileDropZone` avec `accept={['video']}` et `folder="products/videos"`.
  - Garder le champ URL en fallback (input texte visible sous le FileDropZone pour coller une URL externe).
- Le composant `FileDropZone` utilise deja `useFileUpload` qui uploade vers le bucket `media` de Supabase Storage.

---

## 5. Sous-categories

### Objectif
Permettre de creer des sous-categories rattachees a une categorie parente.

### Solution
- **Migration SQL** : Ajouter une colonne `parent_id` (uuid, nullable, FK vers categories.id) dans la table `categories`.
  ```sql
  ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  ```
- **`useCategories.ts`** : Ajouter `parentId` dans `CategoryRecord`, mapper `parent_id` <-> `parentId`. Ajouter un hook `useSubcategories(parentId)` ou filtrer cote client.
- **`AdminSettings.tsx`** (onglet Categories) :
  - Dans le formulaire de categorie (`CategoryForm`), ajouter un champ select "Categorie parente" (optionnel) qui liste les categories existantes (celles sans parent).
  - Afficher les sous-categories indentees sous leur parent dans la liste.
- **`Home.tsx` / `Shop.tsx`** : Les sous-categories peuvent etre affichees sous forme de filtres secondaires dans la boutique. Sur la page d'accueil, ne montrer que les categories principales (celles sans `parent_id`).
- **Filtrage boutique** : Dans `Shop.tsx`, quand on clique sur une categorie, afficher ses sous-categories comme sous-filtres.

---

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/migration` | Colonnes `header_preset`, `header_bg_color`, `header_text_color`, `header_fixed` (design_settings) + `parent_id` (categories) |
| `src/components/admin/HeaderDesignTab.tsx` | Nouveau -- onglet presets header |
| `src/pages/admin/AdminDesign.tsx` | Ajout onglet "Header" |
| `src/components/layout/MainLayout.tsx` | Header conditionnel par preset + sidebar toggle desktop + espacement footer |
| `src/types/index.ts` | Ajout `headerPreset`, `headerBgColor`, etc. dans DesignSettings |
| `src/pages/Home.tsx` | Espacement reduit |
| `src/components/admin/ProductForm.tsx` | FileDropZone pour image/video produit |
| `src/hooks/useCategories.ts` | Ajout `parentId`, mapping `parent_id` |
| `src/pages/admin/AdminSettings.tsx` | Selecteur parent dans CategoryForm + affichage hierarchique |
| `src/pages/Shop.tsx` | Sous-filtres par sous-categories |

---

## Ordre d'implementation

1. Migration SQL (header fields + parent_id categories)
2. Upload produit (FileDropZone dans ProductForm)
3. Espacement compact Home
4. Sidebar desktop avec toggle + animation
5. Header presets (composant + integration MainLayout)
6. Sous-categories (admin + boutique)
