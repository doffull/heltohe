
## Diagnostic

**L'app fonctionne** — le session replay confirme que la page `/admin/design` est chargée et scrollable. Les erreurs `useApp` dans les logs sont **des anciennes erreurs mises en cache par le navigateur** (timestamp `1773008529430` = ancienne build). La correction précédente est bien active (`AppShell` wraps `AppProvider` correctement).

**Problème réel** : La page Design & Visuels a une mise en page trop linéaire — tous les onglets sont listés horizontalement, et chaque onglet est une longue liste de `Card` empilées sans hiérarchie visuelle claire. L'utilisateur veut une meilleure organisation.

**Warning non-bloquant** : `FileDropZone` n'utilise pas `React.forwardRef()` alors qu'il reçoit une ref via `SidebarTab`. À corriger également.

---

## Plan : Refonte de la mise en page AdminDesign

### 1. Nouvelle structure de navigation latérale (layout 2 colonnes)

Remplacer la `<TabsList>` horizontale par une **sidebar de navigation verticale à gauche** + zone de contenu à droite :

```text
┌─────────────────────────────────────────────────────┐
│  Design & Visuels                                   │
├──────────────┬──────────────────────────────────────┤
│ ● Disposition│  [Contenu de l'onglet actif]         │
│ ○ Hero Slider│                                      │
│ ○ Header     │                                      │
│ ○ Logo       │                                      │
│ ○ Sidebar    │                                      │
│ ○ Catégories │                                      │
│ ○ Hotspots   │                                      │
│ ○ Catalogue  │                                      │
└──────────────┴──────────────────────────────────────┘
```

- Colonne gauche fixe (~220px) : liste des onglets avec icône, label, description courte
- Colonne droite : contenu scrollable

### 2. Améliorer le tab Sidebar spécifiquement

Réorganiser le contenu en **sous-sections collapsibles** ou en **grille 2 colonnes** pour les cartes de configuration, au lieu d'une seule colonne de cards empilées :

```text
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ Réapparition automatique        │  │ Presets                         │
│ [switch] [10s] [30s] [1min]     │  │ [Classique] [Minimal] [Dark]... │
└─────────────────────────────────┘  └─────────────────────────────────┘
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ Image mannequin                 │  │ Identité de marque              │
│ [FileDropZone desktop]          │  │ [Nom] [Sous-titre] [Info]       │
│ [FileDropZone mobile]           │  └─────────────────────────────────┘
└─────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│ Éléments visibles [ligne de switches côte à côte]                    │
└──────────────────────────────────────────────────────────────────────┘
```

### 3. Corriger le warning `FileDropZone` + `forwardRef`

Wrapper `FileDropZone` avec `React.forwardRef` dans `FileDropZone.tsx`.

---

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/admin/AdminDesign.tsx` | Refonte layout : nav verticale + contenu 2 colonnes dans le tab Sidebar |
| `src/components/admin/FileDropZone.tsx` | Ajouter `React.forwardRef` |
