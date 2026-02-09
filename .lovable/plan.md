
# Plan : Popup avance, Dashboard mobile, Header mobile, Colonnes categories, Notifications, Photos mobile

---

## 1. Popup ameliore (delai configurable, pas de bouton visible)

### Probleme actuel
Le popup s'affiche apres un delai fixe de 2 secondes. Il n'y a pas de bouton visible sur la page d'accueil (c'est deja le cas -- le popup s'ouvre automatiquement). Mais l'admin ne peut pas configurer le delai.

### Solution
- **Table `banners`** : Ajouter une colonne `display_delay` (integer, defaut 2000, en millisecondes) pour permettre a l'admin de configurer quand le popup apparait.
- **`AdminMarketing.tsx`** (BannerForm) : Ajouter un champ "Delai d'affichage (secondes)" visible uniquement quand le type est "popup".
- **`PopupBanner.tsx`** : Lire le `display_delay` depuis la banniere et l'utiliser dans le `setTimeout` au lieu du 2000ms fixe.
- **`useBanners.ts`** : Mapper le nouveau champ `display_delay`.

### Migration SQL
```sql
ALTER TABLE banners ADD COLUMN IF NOT EXISTS display_delay integer DEFAULT 2000;
```

---

## 2. Selecteur de colonnes pour la grille de categories

### Probleme actuel
La grille des categories est fixe a 4 colonnes (desktop) / 2 colonnes (mobile). L'admin ne peut pas choisir.

### Solution
- **Table `design_settings`** : Ajouter une colonne `category_columns` (integer, defaut 4).
- **`AdminSettings.tsx`** : Ajouter un selecteur "Nombre de colonnes" (2, 3, 4) dans l'onglet Categories.
- **`Home.tsx`** : Appliquer dynamiquement le nombre de colonnes via la classe CSS `grid-cols-{n}` en lisant `designSettings.categoryColumns`.
- **`AppContext.tsx` / `types/index.ts`** : Ajouter `categoryColumns` dans le type `DesignSettings`.

### Migration SQL
```sql
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS category_columns integer DEFAULT 4;
```

---

## 3. Dashboard admin fonctionnel sur mobile

### Probleme actuel
La sidebar admin est fixe a 64px de large (`ml-64`) et n'est pas responsive. Le dashboard ne s'adapte pas.

### Solution
- **`Admin.tsx`** : 
  - Rendre la sidebar masquee par defaut sur mobile, avec un bouton hamburger pour l'ouvrir (Sheet ou overlay).
  - Supprimer le `ml-64` fixe sur mobile, utiliser `lg:ml-64` uniquement.
  - Ajouter un header mobile avec le logo et le bouton menu.
- **`AdminDashboard.tsx`** : 
  - Les grilles stats passent a 1 colonne sur mobile (`grid-cols-1 sm:grid-cols-2`).
  - Les graphiques passent en pleine largeur sur mobile (`grid-cols-1 lg:grid-cols-2`).
  - Reduire la hauteur des graphiques sur mobile.

---

## 4. Header public fonctionnel sur mobile

### Probleme actuel
Le header a un `pl-[180px]` pour le logo, ce qui ecrase tout sur petit ecran. La navigation mobile existe via un Sheet mais le layout est rigide.

### Solution
- **`MainLayout.tsx`** :
  - Remplacer le `pl-[180px]` par une valeur responsive (`pl-4 lg:pl-[180px]`).
  - Masquer le logo-wrapper sur mobile ou le rendre plus petit.
  - Ajuster le spacing pour que les icones (panier, user, menu) soient accessibles sur mobile.

---

## 5. Icone de notification en bas a droite

### Principe
Ajouter un bouton flottant en bas a droite pour gerer les notifications / messages clients.

### Solution
- **`MainLayout.tsx`** : Ajouter un bouton flottant `fixed bottom-6 right-6` avec une icone Bell et un badge pour le nombre de messages non lus.
- **Lecture des messages** : Utiliser la table `messages` existante pour compter les messages non lus (`is_read = false`).
- **Clic** : Ouvrir un panneau Sheet a droite listant les messages recents avec la possibilite de les marquer comme lus.
- **Visible uniquement pour les admins** (via `isAdmin` du contexte auth).

---

## 6. Photos adaptees sur mobile (memes images desktop/mobile + option admin)

### Probleme actuel
Sur mobile, le hero slider montre une image differente (le panneau parallaxe gauche interfere). L'utilisateur veut que ses images soient les memes sur mobile ou pouvoir choisir une version mobile.

### Solution
- **Table `banners` ou `design_settings.hero_slides`** : Ajouter un champ `mobile_image` dans chaque slide du hero pour permettre a l'admin de specifier une image mobile alternative.
- **`AdminDesign.tsx`** (section Hero) : Ajouter un champ "Image mobile (optionnel)" dans le formulaire de chaque slide.
- **`Home.tsx`** : Sur mobile (`useIsMobile()`), utiliser `mobile_image` si defini, sinon l'image desktop standard.
- **Sidebar gauche** : Sur mobile, la sidebar avec le mannequin est deja masquee par defaut (`-translate-x-full lg:translate-x-0`), donc le hero devrait s'afficher correctement en pleine largeur. Si ce n'est pas le cas, s'assurer que `main` n'a pas de `lg:ml-[35%]` sur mobile.

---

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/migration` | Colonnes `display_delay` (banners) et `category_columns` (design_settings) |
| `src/components/home/PopupBanner.tsx` | Delai configurable depuis la banniere |
| `src/pages/admin/AdminMarketing.tsx` | Champ delai dans le formulaire popup |
| `src/hooks/useBanners.ts` | Mapper `display_delay` |
| `src/pages/admin/AdminSettings.tsx` | Selecteur nombre de colonnes |
| `src/pages/Home.tsx` | Colonnes dynamiques + image mobile hero |
| `src/pages/admin/Admin.tsx` | Sidebar responsive (hamburger mobile) |
| `src/pages/admin/AdminDashboard.tsx` | Grilles responsive mobile |
| `src/components/layout/MainLayout.tsx` | Header mobile + bouton notification flottant |
| `src/types/index.ts` | Ajout `categoryColumns`, `mobileImage` dans types |
| `src/pages/admin/AdminDesign.tsx` | Champ image mobile dans le formulaire hero |

---

## Ordre d'implementation

1. Migration SQL (colonnes `display_delay` et `category_columns`)
2. Popup ameliore (delai configurable)
3. Selecteur colonnes categories
4. Admin responsive (sidebar mobile + dashboard mobile)
5. Header public mobile
6. Bouton notification flottant
7. Images mobile hero
