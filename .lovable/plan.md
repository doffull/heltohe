

## Plan : Interdire le stock negatif et bloquer l'ajout en boutique sans stock disponible

### Problemes identifies

1. **Stock negatif possible** : Dans `SizeColorGrid`, `handleCellSave`, et `handleUpdateStock`, aucune validation n'empeche de saisir un nombre negatif.
2. **Ajout en boutique sans stock** : Dans `BoutiquesView > handleAddProduct`, on peut ajouter un produit a une boutique meme s'il n'y a aucun stock dans l'inventaire global. Il faut verifier le stock total avant d'autoriser l'ajout.
3. **Pas d'info stock dans le dialog d'ajout** : Quand on choisit un produit a ajouter en boutique, le stock global disponible n'est pas affiche.

---

### 1. Interdire le stock negatif partout

Modifier les 3 endroits ou le stock est saisi/modifie :

- **`SizeColorGrid > handleCellSave`** (ligne ~761) : Ajouter `if (newQty < 0)` avec toast d'erreur + return
- **`SizeColorGrid`** : L'input deja a `min={0}`, mais ajouter aussi la validation dans `setEditValue` pour forcer `Math.max(0, val)`
- **`BoutiquesView > handleUpdateStock`** (ligne ~1195) : Ajouter `if (newQty < 0)` avec toast d'erreur
- **`InventoryProductDialog`** : Les champs stock initial (`variantGrid`, `sizeStockMap`, `colorStockMap`, `initialStock`) doivent tous forcer `Math.max(0, val)`
- **Import CSV** : Dans `handleConfirmImport`, ignorer les lignes avec `qty < 0` (deja fait avec `qty <= 0`, mais ajouter un message explicite)

---

### 2. Bloquer l'ajout en boutique si pas de stock

Modifier `BoutiquesView > handleAddProduct` :

- Avant l'insertion, calculer le stock total global du produit (tous `stock_levels` pour cet `inventory_id`)
- Si le stock total global = 0, afficher un toast d'avertissement : **"Impossible d'ajouter ce produit : aucun stock disponible dans l'inventaire global. Ajoutez du stock d'abord via l'Inventaire Global."**
- Bloquer l'insertion et ne pas fermer le dialog

Pour le mode variantes : verifier que les quantites saisies ne depassent pas le stock disponible par variante (optionnel mais recommande)

---

### 3. Afficher les infos stock dans le dialog d'ajout en boutique

Modifier le dialog d'ajout de produit en boutique (`addProductOpen` dans `BoutiquesView`) :

- Quand un produit est selectionne dans le Select, afficher sous le Select :
  - **Stock global disponible** : nombre total d'unites en inventaire
  - **Badge couleur** : vert si stock > 0, rouge si stock = 0
  - Si stock = 0 : message d'alerte "Aucun stock disponible - ajoutez du stock d'abord"
- Desactiver le bouton "Ajouter" si stock global = 0

---

### Resume technique

| Element | Modification |
|---|---|
| `AdminStock.tsx` - `SizeColorGrid` | Validation `qty >= 0` dans `handleCellSave` et `setEditValue` |
| `AdminStock.tsx` - `BoutiquesView` | Validation stock > 0 avant ajout, affichage stock dans dialog, toast avertissement |
| `AdminStock.tsx` - `handleUpdateStock` | Validation `qty >= 0` avec toast erreur |
| `InventoryProductDialog.tsx` | `Math.max(0, val)` sur tous les champs stock |

### Fichiers modifies

- `src/pages/admin/AdminStock.tsx`
- `src/components/admin/InventoryProductDialog.tsx`

