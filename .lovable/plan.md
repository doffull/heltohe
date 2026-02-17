

## Plan : Modifier/supprimer tailles et couleurs dans l'inventaire global + Historique des mises en stock

### Contexte

L'inventaire global permet deja de modifier et supprimer des produits complets. Cependant :
1. On ne peut pas modifier les tailles et couleurs d'un produit existant depuis le dialog d'edition (le dialog charge les donnees mais ne permet pas de gerer les variantes en edition)
2. Il n'y a aucun historique des mouvements de stock (ajouts, modifications, suppressions)

---

### 1. Permettre la modification des tailles et couleurs en edition

Modifier `InventoryProductDialog.tsx` pour supporter l'edition complete des variantes :

- En mode edition (`editData` present), charger aussi les `stock_levels` existants pour cet inventaire
- Afficher la meme interface de gestion des tailles (badges cliquables + champ custom) et couleurs (palette + champ custom) qu'en creation
- Permettre d'ajouter ou retirer des tailles et couleurs
- Mettre a jour `products.sizes` et `products.colors` a la sauvegarde
- **Suppression securisee** : Si une taille ou couleur est retiree alors qu'elle a du stock, avertir l'utilisateur que les stock_levels associes seront supprimes

---

### 2. Creer une table `stock_history` pour tracer les mouvements

Nouvelle migration SQL :

```text
CREATE TABLE public.stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL,
  location_id UUID,
  action TEXT NOT NULL,          -- 'add', 'update', 'delete', 'import', 'transfer'
  size TEXT,
  color TEXT,
  quantity_before INTEGER DEFAULT 0,
  quantity_after INTEGER DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- RLS : admin full access
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage stock history"
  ON public.stock_history FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view stock history"
  ON public.stock_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
```

---

### 3. Enregistrer les mouvements dans l'historique

Modifier `AdminStock.tsx` pour inserer un enregistrement `stock_history` a chaque operation :

- **`handleCellSave`** (SizeColorGrid) : log `update` avec qty avant/apres
- **`handleUpdateStock`** (BoutiquesView) : log `update`
- **`handleConfirmImport`** (CSV import) : log `import` par ligne
- **`handleAddProduct`** (ajout en boutique) : log `add`
- **`handleRemoveProduct`** (retrait de boutique) : log `delete`
- **`handleDeleteColor`** (suppression couleur) : log `delete`

Modifier `InventoryProductDialog.tsx` :
- A la creation avec stock initial : log `add`

---

### 4. Ajouter un onglet "Historique" dans la navigation

Ajouter un 5e onglet dans `VIEWS` :

```text
{ key: 'history', label: 'Historique', icon: Clock }
```

Creer un composant `HistoryView` qui affiche :
- Un tableau avec colonnes : Date, Produit, Emplacement, Action, Couleur, Taille, Avant, Apres, Note
- Un filtre par produit et par action
- Badge couleur par type d'action (vert pour ajout, orange pour modification, rouge pour suppression, bleu pour import/transfert)
- Pagination (50 dernieres entrees par defaut)

---

### Resume technique

| Element | Modification |
|---|---|
| Migration SQL | Creer table `stock_history` avec RLS admin |
| `InventoryProductDialog.tsx` | Charger stock_levels en edition, permettre ajout/suppression tailles+couleurs, log historique |
| `AdminStock.tsx` - `SizeColorGrid` | Log historique dans `handleCellSave`, `handleDeleteColor` |
| `AdminStock.tsx` - `BoutiquesView` | Log historique dans `handleAddProduct`, `handleUpdateStock`, `handleRemoveProduct` |
| `AdminStock.tsx` - VIEWS | Ajouter onglet "Historique" |
| `AdminStock.tsx` - `HistoryView` | Nouveau composant avec tableau filtrable |

### Fichiers modifies

- `supabase/migrations/` : nouvelle migration pour `stock_history`
- `src/pages/admin/AdminStock.tsx` : logs historique partout + onglet HistoryView
- `src/components/admin/InventoryProductDialog.tsx` : edition complete tailles/couleurs + logs historique

