
## Analyse des problèmes

### Problème 1 — Clic catégorie → redirige vers Boutique au lieu de /homme, /femme

**Cause identifiée** : Dans `CategoryGrid.tsx`, le clic appelle `navigateToCategory(category.title)`. Dans `AppContext.tsx`, `navigateToCategory` cherche `allCategories.find(c => c.title === category)` puis utilise `cat?.slug`. Si la catégorie n'a **pas de slug défini** en DB (champ `slug` null), elle fait `encodeURIComponent(category.toLowerCase())` → `/homme`. Ça devrait marcher.

**Mais** : la route dans `App.tsx` est `/:categorySlug` qui capture aussi `/boutique`, `/panier`, `/auth`, etc. La route `/boutique/:slugOrId` existe, donc `/boutique` est bien pris, mais les catégories comme `/homme` doivent atterrir sur `CategoryPageRouter`. **Le vrai problème** : si la catégorie s'appelle "Homme" mais n'a pas de slug défini, `encodeURIComponent("homme")` = `homme` → navigate vers `/homme`. `CategoryPageRouter` reçoit `categorySlug = "homme"` et cherche `c.slug === "homme"` OU `normalizeSlug(c.title) === normalizeSlug("homme")`. Si le titre en DB est "Homme" → `normalizeSlug("Homme") = "homme"` → ça devrait matcher.

**Vérification plus précise** : le `useCategories` hook a `queryKey: ['admin-categories']`. L'AppContext utilise aussi `useCategories` pour `navigateToCategory`. Ils partagent le cache → ok.

**Problème réel probable** : Les catégories en DB n'ont peut-être pas de slug. Le `navigateToCategory` fait `cat?.slug || encodeURIComponent(category.toLowerCase())`. Si `cat` est undefined (parce que `allCategories` est vide au moment du clic — race condition), il navigue vers `/boutique` (via le `setCurrentView('Shop')` + `navigate('/boutique')` du `else`).

**Wait** — re-lire le code : 
```js
if (category === 'Tout') {
  navigate('/boutique');
} else {
  const cat = allCategories.find(c => c.title === category);
  const slug = cat?.slug || encodeURIComponent(category.toLowerCase());
  navigate(`/${slug}`);
}
```

Si `allCategories` est vide au moment du clic, `cat` est undefined → `slug = encodeURIComponent("Homme".toLowerCase()) = "homme"` → navigate vers `/homme`. C'est correct.

**Mais attendez** — `CategoryGrid` appelle `navigateToCategory(category.title)` UNIQUEMENT si `!isEditorOpen`. Et le clic check `if (isEditorOpen) startEdit(...)`. 

**Vrai problème trouvé** : Dans `CategoryGrid`, la ligne de navigation utilise `navigateToCategory(category.title)`. La fonction `navigateToCategory` navigue vers `/${slug}`. Mais si le titre est "Homme", slug sera "homme" → `/homme`. La route `/:categorySlug` dans App.tsx devrait catcher ça.

**MAIS** : si les catégories en DB ont des titres avec accents ou espaces ("Vêtements Homme"), le `encodeURIComponent` produira quelque chose de différent de ce que `normalizeSlug` génère dans `CategoryPageRouter`. C'est là le bug principal.

**Solution** : S'assurer que le slug utilisé dans `navigateToCategory` correspond exactement à celui généré par `normalizeSlug` dans `CategoryPageRouter`. On doit utiliser le même `normalizeSlug` dans les deux endroits pour construire l'URL.

### Problème 2 — Gestion produits en vedette / dernières arrivées sur la page d'accueil

L'actuelle `ProductSections` dans `homeSections` utilise un système de tags fixes (`top`, `trending`, `style`, `promo`). Il faut une interface admin dans le **tableau de bord** (AdminDashboard) pour :
- Marquer des produits comme "en vedette" (featured) ou "nouvelle arrivée" (new)
- Ces produits apparaissent dans les sections correspondantes sur la page d'accueil

### Problème 3 — Couleurs globales du site personnalisables

Actuellement les couleurs CSS (`--background`, `--foreground`, `--primary`, etc.) sont fixes dans `index.css`. Il faut une **section Couleurs** dans Admin Design qui permette de changer :
- Couleur de fond du site
- Couleur du texte principal
- Couleur primaire/accent
- Couleur des liens
- Couleur des textes du header/nav
- Couleur du footer
- Mode clair/sombre

Les changements doivent être appliqués via CSS variables dynamiquement (via `style` sur `:root` ou via `designSettings`).

---

## Plan d'implémentation

### Fix 1 — Navigation catégories (Bug critique)

**Fichier : `src/context/AppContext.tsx`**

Ajouter la même `normalizeSlug` function que dans `CategoryPageRouter` et l'utiliser pour construire l'URL :

```js
const normalizeSlug = (s: string) =>
  s.toLowerCase().replace(/\s+/g, '-')
   .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e')
   .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o')
   .replace(/[ùûü]/g, 'u').replace(/ç/g, 'c');

const navigateToCategory = (category: string) => {
  if (category === 'Tout') { navigate('/boutique'); return; }
  const cat = allCategories.find(c => c.title === category);
  // Use explicit slug, or normalize title — always matches CategoryPageRouter logic
  const slug = cat?.slug || normalizeSlug(category);
  navigate(`/${slug}`);
};
```

Aussi vérifier : si les catégories DB ont un slug stocké, il faut que `CategoryPageRouter` matche bien ce slug. On doit s'assurer que lors de la création d'une catégorie, le slug est bien auto-généré depuis le titre.

**Fichier : `src/components/admin/CategoryFormDialog.tsx`** — vérifier que le slug est auto-généré à partir du titre si vide.

### Fix 2 — Section "Produits en vedette" dans AdminDashboard

**Fichier : `src/pages/admin/AdminDashboard.tsx`**

Ajouter un 3ème bloc "GESTION PAGE D'ACCUEIL" avec deux onglets :
- **Produits en vedette** : liste de produits avec checkbox "featured" → met à jour le tag `featured` sur le produit
- **Nouvelles arrivées** : liste avec checkbox "new" → tag `new`

Les produits taggés apparaissent dans les sections correspondantes sur la page d'accueil.

**Fichier : `src/components/home/ProductSections.tsx`**

Ajouter des sections pour les tags `featured` et `new` dans `sectionProducts`.

**Fichier : `src/hooks/useProducts.ts`** — vérifier que les tags sont bien persistés.

### Fix 3 — Palette de couleurs globale dans Admin Design

**Nouveau fichier : `src/components/admin/ColorsTab.tsx`** (ou section dans AdminDesign)

Ajouter un onglet **"Couleurs"** dans la nav de AdminDesign avec :

**Groupe 1 — Site global**
- Fond du site (`--background`)
- Texte principal (`--foreground`)
- Couleur primaire/accent (`--primary`)
- Fond carte (`--card`)
- Texte secondaire (`--muted-foreground`)

**Groupe 2 — Header**
- Fond header (déjà géré via `headerBgColor`)
- Texte navigation (déjà `headerTextColor`)
- Couleur liens actifs

**Groupe 3 — Footer**
- Fond footer
- Texte footer

**Stockage** : dans `designSettings` via des clés comme `globalBgColor`, `globalTextColor`, `globalPrimaryColor`, etc.

**Application dynamique** : dans `MainLayout.tsx`, injecter un `<style>` tag dans le `<head>` qui override les CSS variables :

```jsx
useEffect(() => {
  const root = document.documentElement;
  if (designSettings.globalBgColor) root.style.setProperty('--background', hexToHsl(designSettings.globalBgColor));
  if (designSettings.globalTextColor) root.style.setProperty('--foreground', hexToHsl(designSettings.globalTextColor));
  // ...
}, [designSettings]);
```

Il faut une fonction `hexToHsl` car les CSS variables sont en format HSL.

---

## Fichiers à modifier

| Fichier | Action |
|---|---|
| `src/context/AppContext.tsx` | Corriger `navigateToCategory` avec normalizeSlug |
| `src/components/admin/CategoryFormDialog.tsx` | Vérifier auto-génération slug |
| `src/pages/admin/AdminDashboard.tsx` | Ajouter section gestion page d'accueil |
| `src/components/home/ProductSections.tsx` | Ajouter sections featured/new |
| `src/pages/admin/AdminDesign.tsx` | Ajouter onglet "Couleurs" globales |
| `src/components/layout/MainLayout.tsx` | Appliquer CSS variables dynamiques |
| `src/types/index.ts` | Ajouter champs couleurs dans DesignSettings |

---

## Ce que ça change concrètement

1. **Clic sur "Homme"** → va sur `/homme` (page catégorie dédiée avec header image + produits filtrés) — jamais sur `/boutique`
2. **AdminDashboard** : nouvelle section "Page d'accueil" pour cocher les produits en vedette et nouvelles arrivées → s'affichent sur la homepage
3. **Admin Design → Couleurs** : nouveaux pickers pour fond du site, texte, primaire, header, footer — tout le site se recolore instantanément
