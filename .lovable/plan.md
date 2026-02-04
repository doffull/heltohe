
# Plan : Sidebar Responsive avec Toggle, Barres de Stats et Image de Fond

## Objectif
Transformer le sidebar gauche en un composant interactif complet avec :
1. Toggle responsive pour mobile
2. Barres de statistiques (Durability, Price, Fashion)
3. Image de mannequin en arrière-plan pour l'effet glassmorphism

---

## Modifications Techniques

### 1. Sidebar Responsive avec Toggle Mobile

**Fichier : `src/components/layout/MainLayout.tsx`**

- Ajouter un state `sidebarOpen` pour contrôler la visibilité sur mobile
- Créer un bouton toggle fixe visible uniquement sur mobile/tablette
- Utiliser des transitions CSS fluides pour l'ouverture/fermeture
- Le sidebar sera :
  - **Desktop (lg+)** : Toujours visible, 35% de largeur
  - **Mobile/Tablette** : Masqué par défaut, glisse depuis la gauche au clic

**Bouton Toggle :**
- Icône `PanelLeft` de lucide-react
- Position fixe en bas à gauche de l'écran
- Style cohérent avec le design Helvetica-MP (bevel corners)

### 2. Barres de Statistiques Model Interface

**Composant `StatBar` :**
```text
┌─────────────────────────────────────┐
│ DURABILITY                          │
│ ████████████░░░░░░░  85%            │
├─────────────────────────────────────┤
│ PRICE                               │
│ ██████░░░░░░░░░░░░░  45%            │
├─────────────────────────────────────┤
│ FASHION                             │
│ █████████████████░░  92%            │
└─────────────────────────────────────┘
```

- Barres segmentées horizontales (10 segments)
- Labels en uppercase avec font monospace
- Animation de remplissage au chargement
- Valeurs dynamiques (pourcentage)

### 3. Image de Mannequin en Arrière-plan

**Structure :**
```text
<div class="sidebar-left-panel">
  <img class="mannequin-bg" />     ← Image de fond (opacity réduite)
  <div class="glass-overlay" />    ← Overlay glassmorphism
  <div class="sidebar-content">    ← Contenu (stats, selectors)
    ...
  </div>
</div>
```

- Image de mannequin/modèle positionnée en absolute
- Z-index inférieur au contenu
- Effet de masquage (clip-path) pour sortir du cadre
- Utilisation d'une image placeholder ou URL externe haute qualité

### 4. CSS Additions

**Fichier : `src/index.css`**

Nouvelles classes :
- `.sidebar-toggle-btn` : Style du bouton toggle mobile
- `.stat-bar-container` : Conteneur des barres de stats
- `.stat-bar-label` : Labels des statistiques
- `.stat-bar-track` : Fond de la barre
- `.stat-bar-fill` : Remplissage animé
- `.mannequin-bg` : Style de l'image de fond
- `.sidebar-content` : Conteneur du contenu avec z-index élevé

---

## Structure du Sidebar Mis à Jour

```text
sidebar-left-panel
├── mannequin-bg (image de fond)
├── glass-overlay (effet glassmorphism)
└── sidebar-content
    ├── size-selector (XS, XL buttons)
    ├── stat-bars-section
    │   ├── StatBar (Durability: 85%)
    │   ├── StatBar (Price: 45%)
    │   └── StatBar (Fashion: 92%)
    └── model-info (MODEL 0.1.2)
```

---

## Comportement Responsive

| Breakpoint | Sidebar | Toggle Button | Main Content |
|------------|---------|---------------|--------------|
| < 768px    | Masqué  | Visible       | ml-0         |
| 768-1024px | Masqué  | Visible       | ml-0         |
| >= 1024px  | Visible | Masqué        | ml-[35%]     |

---

## Animations

1. **Toggle Animation** : Slide-in depuis la gauche (transform: translateX)
2. **Stat Bars** : Remplissage progressif au mount (width animation)
3. **Hover Effects** : Scale subtil sur les boutons de taille

---

## Imports Additionnels

- `PanelLeft` ou `Layers` de lucide-react pour l'icône toggle
- Hook `useState` pour gérer l'état du sidebar

---

## Image de Mannequin

Utilisation d'une image placeholder haute qualité :
- URL : Image de mode/mannequin en noir et blanc
- Style minimaliste cohérent avec la marque
- Opacity réduite (0.3-0.5) pour ne pas dominer le contenu
