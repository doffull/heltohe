# Plan — 3 chantiers

## 1. Choisir l'emplacement des sections personnalisées

Aujourd'hui les sections custom sont toujours rendues **à la fin** de la home (`Home.tsx`, bloc `data-home-block="custom"`). On va les transformer en blocs **réordonnables au même titre que `hero`, `categories`, `featured`, etc.**, via le même `HomeBlocksEditor`.

**Modèle** : chaque section custom devient un block avec un id unique `custom:<uuid>` :
```
{ id: 'custom:abc-123', visible: true, label: 'Bannière promo été' }
```

**Admin (`HomeBlocksEditor.tsx`)** :
- Charger les blocks par défaut + un block `custom:<id>` pour chaque entrée de `homeCustomSections` (fusion automatique : on ajoute en bas ceux qui manquent, on retire les ids supprimés).
- Afficher le titre/label de la section custom (pris du 1er bloc texte ou du nom donné dans `HomeCustomSectionsEditor`).
- DnD existant → on peut glisser une section custom **entre** `categories` et `featured`, par exemple.

**`HomeCustomSectionsEditor.tsx`** : ajouter un champ « Nom de la section » (utilisé comme label dans la liste des blocks). À l'enregistrement, mettre à jour `homePageBlocks` pour ajouter les nouveaux ids `custom:<id>`.

**`Home.tsx`** : dans la boucle `blocks.filter(...).map(...)`, si `b.id.startsWith('custom:')` → chercher la section correspondante dans `homeCustomSections` et la rendre avec `PageRenderer`. Plus de bloc `custom` séparé en fin de page.

## 2. Refonte du menu « camembert » → Méga menu premium universel

Le bouton actuel `UnifiedFab` (menu radial en bas) sera remplacé par un **méga menu plein écran** déclenché depuis le même bouton FAB (mobile) et depuis un nouveau bouton dans le `Header` (tablette/desktop).

**Nouveau composant `MegaMenu.tsx`** (overlay plein écran, glassmorphism, animation `framer-motion` avec staggered reveal) :

```text
┌──────────────────────────────────────────────────────┐
│ [Close]                                  [Search]    │
├──────────────────────────────────────────────────────┤
│  CATÉGORIES        │   APERÇU VISUEL                 │
│  • Homme       →   │   ┌────┐ ┌────┐ ┌────┐         │
│  • Femme           │   │img │ │img │ │img │ produits│
│  • Accessoires     │   └────┘ └────┘ └────┘ vedette │
│  • Nouveautés      │                                  │
│                    │   "Collection Hiver 2026"        │
│  PAGES             │                                  │
│  • À propos        │                                  │
│  • Contact         │                                  │
└──────────────────────────────────────────────────────┘
```

- **Mobile** : pleine hauteur, panneau gauche (catégories) en pile verticale, swipe pour fermer.
- **Tablette/Desktop** : split 40/60, hover sur une catégorie → preview 3 produits de cette catégorie à droite (images depuis `useProducts` filtrés).
- Données : `useCategories()` (racines) + `useProducts()` (3 derniers par cat).
- Style : fond `bg-background/95 backdrop-blur-xl`, chamfer/bevel cohérent avec le design industriel existant, accent `--primary`.
- Animations : `motion` avec `AnimatePresence`, slide-down + fade, items staggered 30ms, hover sur item → ligne 45° qui se déploie (cohérent brand).

**FAB** : le `UnifiedFab` actuel devient le déclencheur unique (icône menu burger stylisée). On garde la roue/roulette mais déplacée comme un **item à l'intérieur** du méga menu (« Tentez votre chance »). Le menu camembert radial est supprimé au profit de ce méga menu.

**Header desktop** : ajout d'un bouton « Menu » à gauche du logo qui ouvre le même `MegaMenu`.

## 3. Transitions de page + parallaxe

**Lib** : `framer-motion` (déjà installé) — `AnimatePresence` + `motion.div`.

**`App.tsx` / router** : wrapper `<AnimatePresence mode="wait">` autour des `<Routes>` avec `key={location.pathname}`. Chaque page exporte une `motion.div` racine avec variantes :

```ts
const pageVariants = {
  initial: { opacity: 0, y: 30, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0)', transition: { duration: 0.5, ease: [0.22,1,0.36,1] } },
  exit:    { opacity: 0, y: -20, filter: 'blur(6px)', transition: { duration: 0.3 } },
};
```

**Composant utilitaire `PageTransition.tsx`** : wrappe les enfants avec la variante ci-dessus. Pages clés (`Home`, `Shop`, `ProductDetail`, `Category`, `About`, `Contact`) l'utilisent.

**Parallaxe nav** : pour les transitions entre catégories on ajoute un **flash overlay** (band noir qui balaie l'écran en 400ms diagonal 45° — cohérent brand) via un portal contrôlé par le router. Implémenté dans `PageTransition` avec `motion.div` `clipPath` animé.

**Parallaxe sur scroll** : déjà présent partiellement (`useScroll` dans `Home.tsx`). On généralise via un hook `useParallax(speed)` réutilisable et on l'applique à : hero des catégories, images des sections custom (option `parallax: true` dans `PageBuilder`).

## Détails techniques

### Fichiers modifiés
- `src/components/admin/HomeBlocksEditor.tsx` — fusion blocks par défaut + custom
- `src/components/admin/HomeCustomSectionsEditor.tsx` — champ « nom », sync blocks
- `src/pages/Home.tsx` — rendre `custom:<id>` dans la boucle, supprimer bloc final
- `src/types/index.ts` — `HomeBlock { id: string; visible: boolean; label?: string }`
- `src/components/layout/UnifiedFab.tsx` — déclencheur méga menu
- `src/components/layout/Header.tsx` — bouton Menu desktop
- `src/components/layout/MegaMenu.tsx` — **nouveau** composant méga menu
- `src/components/layout/MainLayout.tsx` — monter `MegaMenu` + provider d'état
- `src/context/MegaMenuContext.tsx` — **nouveau** (open/close global)
- `src/App.tsx` — `AnimatePresence` autour des routes
- `src/components/layout/PageTransition.tsx` — **nouveau** wrapper
- `src/hooks/useParallax.ts` — **nouveau** hook

### Pas de migration DB
`homePageBlocks` est déjà un JSONB libre dans `design_settings`, on étend juste les ids.

### Vérifications
- Admin → Icônes & Sections : créer une section custom « Promo été » → la voir dans `HomeBlocksEditor` → la glisser sous « Catégories » → recharger `/` → la section apparaît bien à cet endroit.
- Mobile 360px : tap FAB → méga menu plein écran avec catégories + preview produits.
- Desktop 1280px : clic « Menu » header → split avec preview live au hover.
- Navigation Home → Shop → Product : fade + blur transition + flash overlay diagonal.
