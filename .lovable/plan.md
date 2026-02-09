
# Corrections mobile : Header, Popup, Colonnes categories, Espacement

---

## Problemes identifies

1. **Header mobile** : Le logo est masque sur mobile (`hidden lg:flex`) et il n'y a aucune marque visible dans le header mobile. Les icones sont la mais aucun branding.
2. **Popup persistant** : Le popup utilise `sessionStorage` mais le composant `PopupBanner` fait un query a chaque rendu. Quand on desactive la banniere dans l'admin (`is_active = false`), le query ne retourne plus rien, donc le popup disparait. Le probleme est que l'ancien `banner` state reste en memoire si la page n'est pas rechargee. De plus, le query filtre par `is_active = true`, donc si l'admin l'a bien desactive, ca devrait ne plus rien charger. Il faut s'assurer que le composant reset son state quand les banners changent.
3. **Selecteur de colonnes categories** : Absent. La colonne `category_columns` existe en base mais le type `DesignSettings` ne contient pas `categoryColumns`, et `AdminSettings` n'a pas de selecteur pour ca.
4. **Espacement mobile** : Les sections ont des paddings enormes (`py-20 lg:py-28`) qui creent des blancs excessifs sur mobile. Le footer aussi a `py-16 mt-20`.
5. **Shop page mobile** : Les filtres (selects, boutons) ne s'empilent pas bien, et le titre est trop gros (`text-5xl`).

---

## 1. Header mobile avec logo

**Fichier** : `src/components/layout/MainLayout.tsx`

- Ajouter le logo/nom de marque dans le header mobile, visible sur mobile, a gauche.
- Remplacer l'espace vide par un `Link to="/"` avec le texte "HMP" ou le logo.
- Structure : `[Logo] --- [icons: cart, user, menu]`

---

## 2. Popup : nettoyage du state quand banniere desactivee

**Fichier** : `src/components/home/PopupBanner.tsx`

- Ajouter un `useEffect` qui remet `banner` a `null` et `open` a `false` quand `banners` est vide (banniere desactivee/supprimee).
- S'assurer que le `sessionStorage` check se fait correctement et que le composant ne persiste pas un ancien state.

---

## 3. Selecteur de colonnes categories

**Fichiers** :
- `src/types/index.ts` : Ajouter `categoryColumns?: number` dans `DesignSettings`
- `src/data/initialData.ts` : Ajouter `categoryColumns: 4` dans les valeurs par defaut
- `src/pages/admin/AdminSettings.tsx` : Ajouter un selecteur (2, 3, 4 colonnes) dans l'onglet Categories, qui sauvegarde dans `designSettings` via `useApp().updateDesignSettings()`
- `src/pages/Home.tsx` : Lire `designSettings.categoryColumns` et appliquer dynamiquement les classes CSS sur la grille des categories (`grid-cols-2`, `grid-cols-3`, `grid-cols-4`)

---

## 4. Espacement mobile compact

**Fichiers** :
- `src/pages/Home.tsx` : Reduire les paddings des sections sur mobile :
  - `py-20 lg:py-28` devient `py-10 lg:py-28`
  - `mb-12` devient `mb-6 lg:mb-12`
  - Titres : `text-4xl lg:text-5xl` devient `text-2xl sm:text-4xl lg:text-5xl`
  - Hero bottom padding : `pb-24` devient `pb-16 lg:pb-24`
  - Newsletter section : `py-24` devient `py-12 lg:py-24`
- `src/components/layout/MainLayout.tsx` (footer) :
  - `py-16 mt-20` devient `py-8 mt-10 lg:py-16 lg:mt-20`
  - `gap-12` devient `gap-6 lg:gap-12`
  - `mb-6` (dans footer items) devient `mb-4 lg:mb-6`
- `src/pages/Shop.tsx` :
  - Titre `text-5xl` devient `text-3xl sm:text-5xl`
  - `py-12` devient `py-6 lg:py-12`
  - `mb-10` devient `mb-6 lg:mb-10`
  - Barre de filtres : les selects passent en pleine largeur sur mobile (`w-full sm:w-[180px]`)

---

## 5. Images hero identiques desktop/mobile

Deja implemente dans le code (`mobileImage` dans `HeroSlide`). Le champ existe dans `AdminDesign.tsx`. Si aucune `mobileImage` n'est definie, l'image desktop est utilisee. Pas de changement necessaire.

---

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/layout/MainLayout.tsx` | Logo dans header mobile + footer compact |
| `src/components/home/PopupBanner.tsx` | Reset state quand banniere desactivee |
| `src/types/index.ts` | Ajout `categoryColumns` |
| `src/data/initialData.ts` | Valeur par defaut `categoryColumns: 4` |
| `src/pages/admin/AdminSettings.tsx` | Selecteur colonnes categories |
| `src/pages/Home.tsx` | Colonnes dynamiques + espacement mobile |
| `src/pages/Shop.tsx` | Espacement et filtres mobile |
