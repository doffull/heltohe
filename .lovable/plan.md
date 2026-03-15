
## Aperçu Live Sidebar — Plan d'implémentation

### Contexte technique

- `SidebarTab` dans `AdminDesign.tsx` (lignes 886-1346) est un composant autonome qui lit `designSettings` depuis `useApp()`
- `SidebarProductHUD` et `StatBar` lisent aussi `designSettings` depuis `useApp()` — ils réagissent déjà aux changements en temps réel
- Le layout AdminDesign est en 2 colonnes : nav gauche (w-52) + contenu droit (flex-1)
- Les CSS classes `sidebar-product-card`, `sidebar-size-badge` etc. sont dans `index.css` (n'ont pas de fichier séparé visible — injectées globalement)

### Approche : Split-view dans SidebarTab

Au lieu d'ajouter un layout 3 colonnes (trop étroit), le `SidebarTab` adopte un **layout 2 colonnes** interne :
- **Colonne gauche** : tous les contrôles existants (inchangés)
- **Colonne droite** : panneau d'aperçu fixe, sticky, qui simule la sidebar du site

L'aperçu est une **miniature proportionnelle** de la sidebar réelle (ratio 9:16, fond = `sidebarBg`, image + gradient + contenu HUD). Puisque `SidebarProductHUD` lit `designSettings` directement, il réagira **instantanément** sans aucun wiring supplémentaire.

```text
┌──────────────────────────────────────────────────────────┐
│  Admin > Design > Sidebar                                │
│                                                          │
│  ┌─────────────────────────┐  ┌──────────────────────┐  │
│  │  Contrôles (existants)  │  │  Aperçu live         │  │
│  │                         │  │  ┌────────────────┐  │  │
│  │  Presets                │  │  │  [image fond]  │  │  │
│  │  Réapparition           │  │  │                │  │  │
│  │  Apparence              │  │  │  Nom marque    │  │  │
│  │  Images mannequin       │  │  │  Carte produit │  │  │
│  │  Identité de marque     │  │  │  Tailles       │  │  │
│  │  Éléments visibles      │  │  │  Stats         │  │  │
│  │  Barres de stats        │  │  │  Boutons CTA   │  │  │
│  │  Boutons                │  │  └────────────────┘  │  │
│  │                         │  │  (sticky, ratio 9:16) │  │
│  └─────────────────────────┘  └──────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Composant `SidebarLivePreview`

Nouveau composant autonome à créer dans `AdminDesign.tsx` (au-dessus de `SidebarTab`) :

**Rendu** :
- Conteneur `sticky top-6` avec ratio `aspect-[9/20]` environ (simulation d'une sidebar tall)
- Fond = `designSettings.sidebarBg` + gradient conditionnel
- Image de fond = `designSettings.sidebarImage` avec `opacity = sidebarImageOpacity`
- Overlay `SidebarProductHUD` en `position: absolute inset-0` — lit déjà `designSettings`
- Badge `APERÇU LIVE` dans le coin supérieur gauche
- Indication `w-[280px]` représentant la largeur réelle

**Attention** : `SidebarProductHUD` utilise `useNavigate` et `useSidebarOptional`. Pour éviter des erreurs dans ce contexte admin, le preview sera un composant simplifié qui **ré-implémente** le rendu visuel directement (sans navigate, sans context de sidebar) en utilisant les mêmes classes et structure que `SidebarProductHUD` mais en mode read-only.

On copie la logique visuelle de `BrandBlock`, `ProductSlide` (sans navigate), et le bloc stats/boutons — tout s'alimente de `designSettings` + 1er produit disponible depuis `useProducts()`.

### Modification de `SidebarTab`

Wrapper le contenu existant dans une grille 2 colonnes :

```tsx
// Avant : <div className="space-y-6">
// Après :
<div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 items-start">
  <div className="space-y-6">
    {/* tous les contrôles existants — inchangés */}
  </div>
  <SidebarLivePreview />
</div>
```

À `xl` (≥1280px) : la preview s'affiche à côté. En dessous : elle se replie en haut (ordre inversé avec `xl:order-last`).

### Fichiers à modifier

| Fichier | Action |
|---|---|
| `src/pages/admin/AdminDesign.tsx` | Ajouter `SidebarLivePreview` + wrapper 2 colonnes dans `SidebarTab` |

Un seul fichier. Pas de DB, pas de nouveaux hooks.

### Détails du preview component

```tsx
function SidebarLivePreview() {
  const { designSettings } = useApp();
  const { data: products = [] } = useProducts();
  const product = products[0] ?? null;
  const brandPosition = designSettings.sidebarBrandPosition ?? 'top';
  const stats = designSettings.stats?.length > 0 ? designSettings.stats : DEFAULT_STATS;
  const sizes = designSettings.sidebarSizes?.length > 0 ? designSettings.sidebarSizes : ['S', 'M', 'L', 'XL'];

  return (
    <div className="sticky top-6 xl:order-last">
      {/* Badge APERÇU LIVE */}
      {/* Conteneur ratio sidebar */}
      <div style={{ background: sidebarBg, ... }} className="relative overflow-hidden rounded-lg border">
        {/* Image fond */}
        {sidebarImage && <img ... style={{ opacity: sidebarImageOpacity }} />}
        {/* Gradient overlay */}
        {sidebarGradient && <div style={{ gradient }} />}
        {/* Contenu HUD en superposition */}
        <div className="absolute inset-0 p-3 pt-8 flex flex-col justify-between text-[0.6em]">
          {/* Top zone */}
          {/* Center zone : produit + stats */}
          {/* Bottom zone : boutons + info */}
        </div>
      </div>
    </div>
  );
}
```

Le texte sera mis à l'échelle avec `transform: scale(0.65)` ou `text-[0.6em]` pour que tout tienne dans le 280px de largeur tout en restant lisible.

### Résultat

- Chaque modification (couleur fond, toggle éléments, opacité image, texte marque, position, stats) se reflète **instantanément** dans l'aperçu sans rechargement
- Le preview est sticky : il reste visible en scrollant dans les contrôles
- Aucune régression sur les contrôles existants
