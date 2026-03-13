

## Three features to build

---

### 1 — Bouton Save + persistance des hotspots (bug critique)

**Cause racine du bug hotspots :**
- `mannequinHotspots` n'est **jamais sauvegardé en base**. La fonction `settingsToDb` dans `useDesignSettings.ts` ne contient pas `mannequin_hotspots`.
- La colonne n'existe pas non plus dans `design_settings`.
- Résultat : à chaque rechargement, les hotspots tombent sur `INITIAL_DESIGN_SETTINGS` (4 hotspots hardcodés). Les suppressions sont perdues.

**Fixes :**

**DB** : Ajouter une colonne `mannequin_hotspots jsonb` à `design_settings` avec `DEFAULT '[]'`.

**`useDesignSettings.ts`** :
- `dbToSettings` : lire `db.mannequin_hotspots`
- `settingsToDb` : écrire `mannequin_hotspots: s.mannequinHotspots as unknown as Json`

**`MannequinHotspot.tsx`** : Supprimer le fallback sur `DEFAULT_HOTSPOTS`. Si le tableau est vide, ne rien afficher.

**Bouton Save explicite** dans `AdminDesign.tsx` : Un bouton "Sauvegarder" fixe en haut du panneau droit qui appelle `saveDesignSettings.mutate(designSettings)` immédiatement (pas de debounce). Avec état `isPending` pour le spinner. Toast de confirmation.

---

### 2 — Associations produits (Looks / Ensembles)

**Nouveau concept : "Looks"** — Associer plusieurs produits pour les vendre ensemble ou séparément.

**DB** : Nouvelle table `product_looks` :
```sql
CREATE TABLE product_looks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```
RLS : Admins gèrent, public peut lire.

**Admin** : Nouvel onglet "Looks" dans `AdminProducts` (ou section dans ProductForm) :
- Liste des looks créés (nom + miniatures produits associés)
- Bouton "Créer un look" → modal avec :
  - Champ nom du look (ex : "Tenue Hiver", "Set Casual")
  - Sélecteur multi-produits (avec images, prix)
  - Prévisualisation des produits sélectionnés

**Fiche produit** (`ProductDetail.tsx`) :
- Si le produit fait partie d'un look → section "Compléter le look" affichant les autres produits du même look avec leur prix et bouton ajout panier individuel.

**Hook** : `useProductLooks` (CRUD complet).

---

### 3 — Styles visuels (Lookbook / Styles)

**Concept : "Styles"** — Des fiches éditoriales associant un nom de style, une image d'ambiance et plusieurs produits.

**DB** : Nouvelle table `product_styles` :
```sql
CREATE TABLE product_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image text,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Admin** : Section "Styles / Looks éditoriaux" dans `AdminMarketing` ou onglet dédié dans `AdminProducts` :
- Créer/éditer des styles avec image d'ambiance + sélection de produits
- Toggle actif/inactif

**Affichage** : Section "Nos styles" sur la page d'accueil (si activé dans homeSections) ou sur la page produit.

---

## Fichiers à modifier / créer

| Fichier | Action |
|---|---|
| `supabase/migrations/...` | Ajouter colonne `mannequin_hotspots`, créer `product_looks`, créer `product_styles` |
| `src/hooks/useDesignSettings.ts` | Lire/écrire `mannequin_hotspots` |
| `src/components/layout/MannequinHotspot.tsx` | Supprimer fallback `DEFAULT_HOTSPOTS` |
| `src/pages/admin/AdminDesign.tsx` | Bouton Save explicite |
| `src/hooks/useProductLooks.ts` | Nouveau hook CRUD looks |
| `src/pages/admin/AdminProducts.tsx` | Onglet / section "Looks" |
| `src/pages/ProductDetail.tsx` | Section "Compléter le look" |
| `src/hooks/useProductStyles.ts` | Nouveau hook CRUD styles |
| `src/pages/admin/AdminMarketing.tsx` | Section gestion des styles |

