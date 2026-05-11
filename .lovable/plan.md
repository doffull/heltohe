## Objectif

Reproduire et corriger les problèmes signalés sur le site **publié** (https://warltkfr.lovable.app) : sur certains navigateurs (Firefox, Samsung Internet, Safari iOS, Edge), la page apparaît **toute noire**, sans logo, sans header — alors que le thème est blanc.

## Diagnostic préliminaire (déjà fait)

En lisant le code, j'ai identifié **3 causes probables**, à confirmer en testant :

### 1. Injection dynamique de variables CSS dans `MainLayout.tsx` (cause #1 la plus probable)
Un `useEffect` écrase `--background`, `--foreground`, `--card`, `--primary` à chaque render à partir de `designSettings` (sauvés en base). La fonction `hexToHsl` :
- ne gère **que** les hex 6 caractères (`#ffffff`) → un `#fff` saisi en admin produit `NaN NaN% NaN%` → variable invalide → la valeur reste à la précédente (parfois noire).
- ne gère ni `rgb()`, ni `hsl()`, ni les noms de couleur.
- est appelée même quand `designSettings` n'a pas fini de charger → flash noir possible.
- Si `globalBgColor` ou `globalTextColor` a été enregistré à une mauvaise valeur en base (ou hérité d'un test), tout le site bascule en noir **uniquement en prod** (où la base est différente du dev seed).

### 2. `HeroErrorBoundary` à fond noir
Le fallback du hero utilise `background: linear-gradient(135deg,#1a1a1a,#000)` → si le composant `TechwearHero` crash sur un navigateur (ex. API non supportée, image manquante), l'utilisateur voit **un grand bloc noir** à la place du hero, ce qui ressemble exactement à la description.

### 3. Compatibilité CSS
- `clip-path: polygon(...)` est utilisé sur `sidebar-left-panel`, `bevel-corners`, header bevels → supporté partout, mais **mal rendu sur Samsung Internet ancien** (peut masquer le contenu).
- `backdrop-filter` sans préfixe sur certaines règles → Firefox <103 affiche le fond opaque → si la couleur de fond de la `glass-dark` est trop sombre, le contenu derrière disparaît.
- Aucun `<meta name="theme-color">` ni `color-scheme: light` dans `index.html` → certains navigateurs (Samsung, iOS) appliquent un thème sombre système au chrome de la page.

## Plan d'action

### Phase 1 — Reproduction (browser tool + URL publiée)
1. Ouvrir l'URL **publiée** (`https://warltkfr.lovable.app`) avec le browser tool sur 3 viewports (360, 768, 1280).
2. Lire `console` + `network` pour repérer toute erreur JS ou ressource 404 (logo, image hero, fonts).
3. Inspecter `getComputedStyle(document.documentElement)` pour `--background`, `--foreground` → confirmer la valeur effective en prod.
4. Inspecter `designSettings` réellement renvoyés par Supabase pour cette URL.

### Phase 2 — Corrections ciblées (frontend uniquement)

**A. `index.html`**
- Ajouter `<meta name="color-scheme" content="light only">` et `<meta name="theme-color" content="#ffffff">` pour empêcher les navigateurs d'inverser la palette.
- Ajouter un fallback CSS inline dans `<head>` : `html,body{background:#fff;color:#000;}` pour éviter le flash noir avant chargement React.

**B. `src/components/layout/MainLayout.tsx`**
- Durcir `hexToHsl` :
  - Accepter `#fff`, `#ffffff`, `rgb()`, `hsl()`, et chaînes vides.
  - Retourner `null` proprement si parsing échoue (au lieu de `NaN`).
- Ne **pas** appliquer la variable si `hsl` est `null` (ne pas écraser la valeur par défaut).
- Ne lancer le `useEffect` qu'**après** que `designSettings` soit réellement chargé (guard sur la présence d'une valeur connue).
- Logger un warning console si une couleur invalide est détectée.

**C. `src/components/home/HeroErrorBoundary.tsx`**
- Remplacer le fond noir par un fond `hsl(var(--background))` cohérent avec le thème (blanc), pour éviter le “bloc noir” sur erreur.
- Logger l'erreur dans Supabase / `console.error` détaillé pour diagnostic.

**D. `src/index.css` + `src/styles/home-techwear.css`**
- Ajouter `@supports not (backdrop-filter: blur(10px))` → fallback solide opaque clair pour `.glass`, `.glass-dark`, panneaux techwear, afin que Firefox ancien ne montre pas un bloc noir.
- Vérifier que toutes les règles `backdrop-filter` ont leur jumeau `-webkit-backdrop-filter` (pour Safari).
- Vérifier que les `clip-path` critiques (header, logo wrapper, sidebar) ne masquent pas le contenu si non supportés → ajouter `@supports (clip-path: polygon(0 0))` pour les rendre conditionnels.

**E. Préchargement / robustesse logo**
- Dans `BrandLogo.tsx`, ajouter `onError` sur l'`<img>` pour basculer sur le texte de marque si le logo Supabase ne charge pas (ressource 404 sur certains navigateurs / régions).
- Ajouter `loading="eager"` + `decoding="async"` au logo header (au lieu du défaut).

**F. Vérification de la base `design_settings`**
- Lire la ligne `design_settings` en prod via `supabase--read_query` et confirmer que `globalBgColor`, `globalTextColor`, `headerBgColor` ne contiennent pas de valeur sombre involontaire. Si oui, proposer un patch (migration ou simple update via admin) — **sans modifier la base sans accord**.

### Phase 3 — Validation cross-navigateur

Le browser tool ne fournit qu'un seul moteur (Chromium). Je vais donc :
1. Vérifier le rendu sur viewports 360 / 768 / 1280 dans le browser tool après corrections.
2. Lister les **points à valider manuellement** par toi sur Firefox, Safari iOS, Samsung Internet, Edge, après publication d'une nouvelle version :
   - Page d'accueil non-noire au premier chargement.
   - Logo + header présents.
   - Sidebar et panneaux glass lisibles.
3. Fournir une checklist + extraits console à me renvoyer si un cas reste cassé.

## Hors scope

- Pas de refonte design.
- Pas de changement de logique métier ou de schéma DB.
- Pas de polyfill JS lourd : seulement CSS `@supports` et fallbacks ciblés.
- Pas d'écriture en base sans confirmation explicite.

## Livrables

- 4–6 fichiers modifiés (index.html, MainLayout.tsx, HeroErrorBoundary.tsx, BrandLogo.tsx, index.css, home-techwear.css).
- Un récap des erreurs console / network observées en prod.
- Une checklist de validation manuelle multi-navigateurs.
