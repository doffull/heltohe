

## Plan : Regrouper les variantes par taille avec pastilles couleur inline

### Problème actuel
Quand on expand un produit, chaque combinaison taille×couleur est affichée sur sa propre ligne (ex: Noir/XS, Gris/XS, Blanc/XS, Noir/S, Gris/S, Blanc/S...). Pour un produit avec 6 tailles et 6 couleurs, cela fait 36 lignes — beaucoup trop long.

### Solution
Regrouper par **taille** : chaque ligne enfant = une taille (XS, S, M, L...). À côté du nom de la taille, afficher les **pastilles couleur** avec le stock de chaque couleur pour cette taille. Cliquer sur une pastille ouvre un petit popover inline pour modifier la quantité de stock de cette combinaison taille×couleur.

### Structure visuelle après changement

```text
▼ Marco                    [pastilles parent]  B2C   12   0   12   10   OK
  ├─ XS  ●2 ●0 ●1 ●3                               6    0    6
  ├─ S   ●1 ●0 ●2 ●0                               3    0    3
  ├─ M   ●0 ●1 ●1 ●1                               3    0    3
  └─ XL  ...                                        ...
```

Chaque ● est une pastille couleur cliquable. Au clic → popover avec le nom de la couleur, la quantité actuelle, et un champ pour la modifier.

### Changements dans `src/pages/admin/AdminStock.tsx`

**A. Nouveau composant `SizeColorStockCell`**
- Reçoit : inventoryId, size, couleurs du produit, stockLevels, webLocationId, onRefresh
- Affiche des pastilles couleur avec badge de quantité
- Au clic sur une pastille → popover avec input pour modifier le stock de cette combinaison taille×couleur
- Bouton crayon + save inline

**B. Refactorer les lignes enfant (variant rows)**
- Au lieu de boucler sur `uniqueVariants` (toutes les combinaisons), boucler sur les **tailles uniques** du produit
- Chaque ligne de taille affiche :
  - La taille (XS, S, M...)
  - Les pastilles couleur avec stock inline (`SizeColorStockCell`)
  - Le total Web pour cette taille (toutes couleurs)
  - Les totaux boutiques pour cette taille
- Si le produit n'a pas de couleurs, garder le comportement actuel (simple ligne par taille)
- Si le produit n'a pas de tailles mais a des couleurs, afficher une seule ligne avec les pastilles couleur

**C. Conserver le `VariantLabelEditor` pour l'édition du nom de taille**
- Le crayon à côté du nom de taille permet de renommer la taille
- La modification des couleurs se fait via les pastilles

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/admin/AdminStock.tsx` | Nouveau composant `SizeColorStockCell`, refactorer les variant rows pour regrouper par taille avec pastilles couleur cliquables |

