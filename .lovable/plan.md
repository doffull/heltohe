
## Audit complet — 3 bugs identifiés et leur cause exacte

### Bug 1 — Logo invisible dans le header

**Cause racine :** La condition à la ligne 184 de `MainLayout.tsx` :
```typescript
designSettings.showLogo !== false && designSettings.hudLogo ? (
  <img src={designSettings.hudLogo} ... />
```
Le problème est que `designSettings.hudLogo` provient du hook `useDesignSettings` qui charge depuis la base de données. Tant que ce chargement est en cours, `hudLogo` est `undefined` (valeur par défaut dans `INITIAL_DESIGN_SETTINGS`). **Mais le vrai problème :** la condition `designSettings.showLogo !== false` est évaluée en premier — si `showLogo` est `false` en base (ou `null`), le logo est masqué même si une URL est présente. De plus, `hudLogo` est une chaîne vide `''` par défaut dans `INITIAL_DESIGN_SETTINGS`, ce qui rend la condition fausse dès le départ et affiche le fallback texte à la place de l'image.

**Fix :** Simplifier la condition de rendu logo pour ne vérifier que l'URL, et ajouter un `onLoad` propre + éviter l'`onError` qui cache l'élément sans fallback.

---

### Bug 2 — Sidebar s'ouvre à 3 secondes au lieu du délai configuré

**Cause racine exacte :** Ligne 103 de `MainLayout.tsx` :
```typescript
sidebarClosedByUser ? sidebarReappearDelay : Math.min(sidebarReappearDelay, 3000)
```
Lors de la **première ouverture** (l'utilisateur n'a pas encore fermé manuellement), le délai est forcé à `Math.min(sidebarReappearDelay, 3000)` — c'est-à-dire **maximum 3 secondes**, peu importe ce qui est configuré en admin. Si l'utilisateur règle 12 secondes (12000ms), il obtient quand même 3 secondes à la première visite.

La logique mobile fait pareil, hardcodée à 3000ms (ligne 114).

**Fix :** Supprimer le `Math.min(... 3000)` et utiliser directement `sidebarReappearDelay` pour les deux cas (première ouverture ET réapparition). Si l'admin configure 12s, ça s'ouvre en 12s, point.

---

### Bug 3 — Clic sur "Hommes" dans la nav ne navigue pas vers la page Hommes

**Cause racine :** Dans `MainLayout.tsx` lignes 74-89, les catégories sont insérées dans `navItems` avec `href: /${c.slug}`. Puis elles sont rendues avec `<Link to={item.href}>` (React Router). Cela fonctionne si la route `/:categorySlug` est bien enregistrée et si le `CategoryPageRouter` trouve la catégorie par son slug.

La vraie cause est dans `CategoryPageRouter.tsx` ligne 15 :
```typescript
const category = categories.find(c => c.slug === categorySlug);
```
Si la catégorie "Hommes" a un `slug` null/undefined en base de données, le `find` échoue → retourne `<NotFound />`. Le slug par défaut calculé dans `MainLayout.tsx` est `encodeURIComponent(c.title.toLowerCase())` → `"hommes"`, mais si en base le slug est `"homme"` (sans s) ou vide, la route `/hommes` ne matchera jamais la catégorie.

**Fix en deux parties :**
1. Harmoniser la navigation : utiliser `c.slug || c.title.toLowerCase().replace(/\s+/g, '-')` partout de manière cohérente
2. Dans `CategoryPageRouter`, faire une correspondance plus robuste : slug OU title normalisé

---

## Plan d'implémentation

**Fichier : `src/components/layout/MainLayout.tsx`**

1. **Logo** (lignes 180-201) : Réécrire la condition logo pour afficher l'image si `hudLogo` est non-vide, avec un fallback texte propre. Supprimer la dépendance fragile à `showLogo` qui peut masquer le logo silencieusement.

2. **Sidebar delay** (ligne 103) : Remplacer `Math.min(sidebarReappearDelay, 3000)` par `sidebarReappearDelay` directement. Ligne 114 pareil pour mobile.

3. **Navigation catégories** (lignes 74-89) : Normaliser le calcul du slug identiquement à `CategoryPageRouter`.

**Fichier : `src/pages/CategoryPageRouter.tsx`**

4. **Matching robuste** (ligne 15) : Ajouter un fallback de correspondance par titre normalisé si le slug ne matche pas :
```typescript
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[àâä]/g, 'a');
const category = categories.find(c => 
  c.slug === categorySlug || 
  normalize(c.title) === normalize(categorySlug || '')
);
```

Ces 4 corrections ciblées règlent les 3 bugs signalés.
