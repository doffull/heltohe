

## Plan : Import/Export CSV, Stock initial par variante, et Date de mise en stock

### 1. Date de mise en stock (migration SQL)

Ajouter une colonne `stocked_at` a la table `stock_levels` pour tracer la date d'entree de chaque ligne de stock.

```text
ALTER TABLE public.stock_levels
  ADD COLUMN stocked_at TIMESTAMPTZ DEFAULT now();
```

Cette colonne sera automatiquement remplie a la creation. Elle sera aussi editable pour permettre de saisir une date d'entree differente.

---

### 2. Stock initial par taille x couleur dans le dialog d'ajout inventaire

Modifier `InventoryProductDialog.tsx` pour remplacer le champ "Stock initial (Web)" par une grille taille x couleur quand le produit a des variantes :

- Si le produit a des tailles ET des couleurs configurees : afficher la matrice editable (comme dans la vue boutique)
- Sinon : garder le champ stock global unique
- A la sauvegarde, creer un `stock_levels` par combinaison taille/couleur avec quantite > 0 (sur la location Web)
- Chaque `stock_levels` cree aura `stocked_at = now()` (par defaut)

### 3. Import/Export CSV pour la grille taille x couleur

#### Export CSV
Ajouter un bouton "Exporter CSV" dans le composant `SizeColorGrid` (dans `AdminStock.tsx`) :

- Genere un fichier CSV avec colonnes : `Couleur, Taille, Quantite, Reserve, Date mise en stock`
- Telecharge automatiquement le fichier via `URL.createObjectURL` + `<a download>`
- Nom du fichier : `stock_{nomBoutique}_{nomProduit}_{date}.csv`

#### Import CSV
Ajouter un bouton "Importer CSV" dans `SizeColorGrid` :

- Accepte un fichier `.csv` avec format attendu : `Couleur,Taille,Quantite`
- Parse le CSV cote client (pas besoin d'edge function)
- Affiche un apercu des lignes a importer avec validation (couleurs/tailles reconnues vs inconnues)
- A la confirmation : upsert dans `stock_levels` (update si la combinaison existe, insert sinon)
- Chaque nouvelle entree recoit `stocked_at = now()`

---

### 4. Affichage de la date de mise en stock

- Dans `SizeColorGrid` : ajouter un tooltip sur chaque cellule affichant la date de mise en stock
- Dans le bon de livraison : ajouter une colonne "Date entree" pour chaque ligne de stock
- Dans le tableau inventaire global : optionnel, afficher la date la plus recente

---

### Resume technique

| Element | Modification |
|---|---|
| Migration SQL | Ajout colonne `stocked_at` a `stock_levels` |
| `InventoryProductDialog.tsx` | Grille taille x couleur pour stock initial, passer `stocked_at` |
| `AdminStock.tsx` - `SizeColorGrid` | Boutons Export/Import CSV, tooltip date, mise a jour `stocked_at` a chaque insert |
| `AdminStock.tsx` - `generateDeliveryNote` | Colonne date d'entree dans le bon de livraison |

### Format CSV attendu

```text
Couleur,Taille,Quantite
PINK,XS,31
PINK,S,167
PINK,M,167
BLACK,XS,81
BLACK,S,567
...
```

### Fichiers modifies

- `supabase/migrations/` : nouvelle migration pour `stocked_at`
- `src/components/admin/InventoryProductDialog.tsx` : grille variante pour stock initial
- `src/pages/admin/AdminStock.tsx` : export/import CSV dans `SizeColorGrid`, affichage date, mise a jour delivery note

