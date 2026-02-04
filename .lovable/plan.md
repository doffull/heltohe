

# Plan : Parallax Sidebar, Stats Dynamiques et Hotspots Interactifs

## Objectif
Ajouter trois fonctionnalites avancees au panneau lateral Model Interface :
1. Effet parallax sur l'image de fond au scroll
2. Statistiques dynamiques connectees aux produits
3. Hotspots interactifs sur le mannequin

---

## 1. Effet Parallax sur l'Image de Fond

### Implementation
- Utiliser un hook `useEffect` avec un event listener sur le scroll
- Calculer le deplacement vertical de l'image proportionnel a la position de scroll
- Appliquer une transformation CSS `translateY` sur l'image de fond
- Utiliser `will-change: transform` pour optimiser les performances

### Structure Technique
```text
MainLayout.tsx
├── useState: scrollY (position de scroll)
├── useEffect: scroll listener avec requestAnimationFrame
└── Background Image: transform: translateY(scrollY * 0.3)
```

### Code Parallax
- Multiplicateur parallax : 0.3 (mouvement subtil)
- Performance : throttling avec requestAnimationFrame
- Fallback mobile : effet reduit ou desactive

---

## 2. Statistiques Dynamiques Connectees aux Produits

### Nouveau Contexte : SidebarContext
Creer un contexte pour gerer l'etat du produit survole/selectionne :

```text
src/context/SidebarContext.tsx
├── hoveredProduct: Product | null
├── setHoveredProduct: (product) => void
├── currentStats: { durability, price, fashion }
└── calculateStats: (product) => Stats
```

### Calcul des Statistiques
Mapper les attributs produits vers les stats du sidebar :
- **Durability** : Base sur `attributes.Durabilite` ou `material`
- **Price** : Inverse du ratio prix (100 - (prix/500)*100)
- **Fashion** : Score base sur categorie et attributs

### Integration
- **ProductCard.tsx** : onMouseEnter/onMouseLeave declenchent setHoveredProduct
- **Shop.tsx** : Wrapper avec SidebarProvider
- **MainLayout.tsx** : Consomme hoveredProduct et met a jour les stats
- **StatBar.tsx** : Animation fluide lors du changement de valeur

### Valeurs par Defaut (aucun produit survole)
```text
Durability: 85%
Price: 45%
Fashion: 92%
```

---

## 3. Hotspots Interactifs sur le Mannequin

### Composant : MannequinHotspot
Creer des points cliquables avec tooltips techniques :

```text
src/components/layout/MannequinHotspot.tsx
├── Props: x, y, label, details, icon
├── State: isHovered
├── Tooltip: position dynamique
└── Animation: pulse + scale on hover
```

### Configuration des Hotspots
```text
const HOTSPOTS = [
  {
    id: 'collar',
    x: 50%, y: 15%,
    label: 'COL TECHNIQUE',
    details: 'Protection coupe-vent integree',
    icon: Shield
  },
  {
    id: 'pocket',
    x: 30%, y: 45%,
    label: 'POCHE TACTIQUE',
    details: 'Acces rapide securise',
    icon: Package
  },
  {
    id: 'fabric',
    x: 70%, y: 60%,
    label: 'TISSU TECHNIQUE',
    details: 'Gore-Tex Pro impermeabilite',
    icon: Layers
  },
  {
    id: 'hem',
    x: 50%, y: 85%,
    label: 'OURLET AJUSTABLE',
    details: 'Cordon elastique integre',
    icon: Move
  }
]
```

### Style des Hotspots
```text
┌─────────────────────────────────────┐
│     ●  ← Point pulse (8x8px)        │
│    /│\                              │
│   ┌─────────────────────┐           │
│   │ COL TECHNIQUE       │ Tooltip   │
│   │ Protection coupe-   │ apparait  │
│   │ vent integree       │ au hover  │
│   └─────────────────────┘           │
└─────────────────────────────────────┘
```

---

## Fichiers a Modifier/Creer

### Fichiers a Creer
1. `src/context/SidebarContext.tsx` - Contexte pour les stats dynamiques
2. `src/components/layout/MannequinHotspot.tsx` - Composant hotspot

### Fichiers a Modifier
1. `src/components/layout/MainLayout.tsx`
   - Ajout du parallax scroll effect
   - Integration des hotspots
   - Consommation du SidebarContext

2. `src/components/layout/StatBar.tsx`
   - Animation smooth lors du changement de valeur
   - Transition des segments

3. `src/pages/Shop.tsx`
   - Wrapper SidebarProvider
   - Handler onMouseEnter/onMouseLeave sur les cartes produit

4. `src/components/products/ProductCard.tsx`
   - Props pour hover handlers
   - Declenchement du changement de stats

5. `src/index.css`
   - Styles pour les hotspots
   - Animation pulse pour les points

---

## CSS Additions

```css
/* Hotspot Styles */
.mannequin-hotspot {
  position: absolute;
  width: 12px;
  height: 12px;
  cursor: pointer;
  z-index: 30;
}

.hotspot-point {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid white;
  border-radius: 50%;
  animation: hotspot-pulse 2s ease-in-out infinite;
}

@keyframes hotspot-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
}

.hotspot-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px 16px;
  font-size: 11px;
  min-width: 180px;
  pointer-events: none;
  opacity: 0;
  transform: translateY(5px);
  transition: all 0.3s ease;
}

.mannequin-hotspot:hover .hotspot-tooltip {
  opacity: 1;
  transform: translateY(0);
}
```

---

## Flux de Donnees

```text
┌──────────────────┐    hover    ┌─────────────────┐
│  ProductCard     │ ─────────►  │ SidebarContext  │
└──────────────────┘             │ hoveredProduct  │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │   MainLayout    │
                                 │   (StatBars)    │
                                 └─────────────────┘
```

---

## Comportement Attendu

1. **Scroll** : L'image du mannequin se deplace legerement vers le haut/bas creant un effet de profondeur

2. **Hover Produit** : 
   - Survol d'une carte produit dans la boutique
   - Les barres de stats du sidebar se mettent a jour avec animation
   - Retour aux valeurs par defaut en quittant le produit

3. **Hotspots** :
   - Points visibles avec animation pulse
   - Tooltip apparait au survol avec details techniques
   - Design coherent avec l'esthetique Helvetica-MP

