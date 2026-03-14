
## Unification de l'espace Catégories

### Problème actuel — 3 espaces séparés

```text
AdminSettings → onglet "Catégories"
  → CRUD complet (DB) : image, slug, SEO, sous-catégories  ← le vrai
  
AdminDesign → onglet "Catégories"
  → Gestion designSettings.categories (JSONB local) : titre + image seulement ← doublon/legacy

CategoryGrid.tsx
  → Utilise DB en priorité, fallback designSettings.categories ← incohérent
```

L'utilisateur voit ses catégories (Homme, Femme, etc.) sur l'accueil mais ne sait pas où les gérer car elles sont réparties entre deux endroits distincts.

---

### Solution — Un seul espace unifié dans Admin Design → Catégories

**Ce qu'on garde et centralise :**
- Le `CategoriesTab` dans `AdminDesign.tsx` absorbe **tout** : CRUD DB complet + layout/preset de grille
- Le `CategoryFormDialog` est utilisé directement depuis cet onglet
- La liste des catégories affiche les cartes avec image + titre + sous-catégories + ordre de tri
- Les presets de layout (grille compacte, portrait, etc.) restent en haut

**Ce qu'on supprime :**
- L'onglet "Catégories" dans `AdminSettings.tsx` est retiré (ou redirigé vers Design)
- `designSettings.categories` n'est plus utilisé nulle part (c'était un système legacy)
- `CategoryGrid.tsx` : suppression du fallback `designSettings.categories`, toujours DB

---

### Fichiers à modifier

| Fichier | Action |
|---|---|
| `src/pages/admin/AdminDesign.tsx` — `CategoriesTab` | Remplacer la gestion JSONB locale par CRUD DB complet (`useCategories` + `CategoryFormDialog`) |
| `src/pages/admin/AdminSettings.tsx` | Supprimer l'onglet "Catégories" (redirection vers Design) |
| `src/components/home/CategoryGrid.tsx` | Supprimer le fallback `designSettings.categories` — toujours DB |

---

### Nouveau `CategoriesTab` dans AdminDesign

**Structure en 2 blocs :**

**Bloc 1 — Mise en page de la grille** (conservé tel quel)
- Presets visuels : Compact / Carré / Portrait / Banner / 2 colonnes larges
- Colonnes, ratio, espacement

**Bloc 2 — Gestion des catégories** (nouveau, remplace l'ancienne gestion JSONB)
- Header avec compteur + bouton "Nouvelle catégorie"
- Grille de cartes : chaque carte affiche image en fond (h-32) + titre + slug + badge nombre de sous-catégories + menu Modifier/Supprimer
- Sous-catégories indentées sous leur parent
- Clic "Modifier" → ouvre `CategoryFormDialog` (déjà existant et complet : image, slug, SEO, parent, ordre)
- Clic "Supprimer" → confirmation + delete

**AdminSettings** : l'onglet Catégories est remplacé par une notice "Gérez vos catégories dans Design & Visuels → Catégories" avec un bouton lien.
