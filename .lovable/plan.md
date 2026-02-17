

## Plan : Stock par Taille et Couleur + Icones Couleurs

### Contexte

Actuellement, la table `stock_levels` stocke une seule quantite globale par produit/boutique. L'image de reference montre un tableau de type "matrice" avec les couleurs en lignes et les tailles en colonnes, avec des quantites individuelles et des totaux.

---

### 1. Modification de la base de donnees

Ajouter deux colonnes a la table `stock_levels` pour permettre la ventilation par taille et couleur :

```text
ALTER TABLE stock_levels
  ADD COLUMN size TEXT DEFAULT NULL,
  ADD COLUMN color TEXT DEFAULT NULL;
```

- `size = NULL` et `color = NULL` : stock global (retro-compatible avec les donnees existantes)
- `size = 'M'` et `color = 'BLACK'` : stock pour une combinaison specifique

Supprimer la contrainte d'unicite actuelle si elle existe sur `(inventory_id, location_id)` et en creer une nouvelle sur `(inventory_id, location_id, size, color)` via COALESCE pour gerer les NULLs.

---

### 2. Interface "Grille Taille x Couleur" dans la vue Boutique

Modifier la section detail boutique dans `AdminStock.tsx` :

- Quand on clique sur un produit dans la boutique, afficher un panneau expandable ou un dialog montrant la **matrice taille/couleur** (comme l'image de reference)
- Lignes = couleurs du produit (avec pastille coloree)
- Colonnes = tailles du produit (XS, S, M, L, XL, XXL)
- Cellules = quantites editables inline
- Colonne "Total" a droite avec somme par couleur
- Les totaux en rouge si stock bas

---

### 3. Ajout de produit avec ventilation taille/couleur

Modifier le dialog "Ajouter un produit a la boutique" :

- Apres selection du produit, charger ses tailles et couleurs depuis la table `products`
- Afficher la grille taille/couleur vide a remplir
- A la sauvegarde, creer une entree `stock_levels` par combinaison taille/couleur non-nulle
- Garder aussi la possibilite d'ajouter un stock global (sans taille/couleur) pour les produits sans variantes

---

### 4. Modification du stock inline

Dans la grille existante du detail boutique :

- Au lieu d'une seule ligne par produit, afficher un accordeon/expander
- Ligne principale = nom produit, SKU, total global
- Sous-lignes (expandables) = la matrice taille x couleur editable
- Modifier une cellule = UPDATE du `stock_levels` correspondant
- Ajouter une couleur/taille = INSERT d'un nouveau `stock_levels`
- Supprimer une ligne couleur = DELETE des `stock_levels` de cette couleur

---

### 5. Icones et pastilles couleur

- Afficher une pastille ronde coloree (cercle CSS avec `backgroundColor`) a cote de chaque nom de couleur
- Dans le tableau principal (vue boutique), remplacer la colonne "Couleurs" textuelle par des pastilles colorees cliquables
- Mapper les noms de couleurs courants (PINK, BLACK, BLUE, GREY LIGHT, etc.) a des codes hex pour l'affichage

---

### 6. Mise a jour du bon de livraison

Modifier `generateDeliveryNote` pour inclure la ventilation par taille/couleur :

- Pour chaque produit, afficher la sous-table taille x couleur dans le bon de livraison
- Inclure les totaux par couleur et le total general du produit

---

### 7. Adaptation des fonctions existantes

- `getStockForItem` : sommer toutes les lignes `stock_levels` (avec ou sans size/color) pour un inventory_id
- `handleUpdateStock` : mettre a jour la ligne specifique (avec size + color)
- `handleAddProduct` : creer les entrees ventilees ou globales selon le produit
- `handleRemoveProduct` : supprimer toutes les lignes liees au produit dans la boutique

---

### Resume technique

| Element | Modification |
|---|---|
| Migration SQL | Ajout colonnes `size` et `color` a `stock_levels`, contrainte unique |
| `AdminStock.tsx` | Grille matrice taille x couleur, pastilles couleur, accordeon detail, dialog ajout avec variantes |
| `AdminStock.tsx` (delivery note) | Ventilation taille/couleur dans le bon de livraison |

### Apercu de la grille (comme l'image de reference)

```text
Produit: ALICANTE
+-------------+----+-----+-----+-----+-----+-----+-------+
| Couleur     | XS |  S  |  M  |  L  | XL  | XXL | Total |
+-------------+----+-----+-----+-----+-----+-----+-------+
| [*] PINK    | 31 | 167 | 167 | 117 |  67 |     |   549 |
| [*] BLACK   | 81 | 567 | 567 | 317 | 166 | 140 | 1 838 |
| [*] BLUE    | 31 | 167 | 167 | 117 |  67 |     |   549 |
| [*] GR.LIGHT|    | 167 | 167 | 117 |  67 |     |   518 |
+-------------+----+-----+-----+-----+-----+-----+-------+
[*] = pastille coloree
Cellules editables au clic
```
