
## Analyse de la situation actuelle

**Ce qui existe déjà :**

1. **`InventoryProductDialog.tsx`** (dans `/admin/stock`) : gestion complète du stock par taille et couleur — grille variantes couleur×taille, stock par taille seule, stock par couleur seule. Mais c'est uniquement accessible depuis `/admin/stock → Inventaire Global`. Les utilisateurs ne le trouvent pas depuis `/admin/produits`.

2. **`ProductForm.tsx`** (dans `/admin/produits`) : formulaire produit qui gère les tailles disponibles et les couleurs, mais le stock est un **chiffre global unique** — pas de ventilation par taille/couleur.

3. **Suppression en masse** : déjà implémentée via `useBulkDeleteProducts` et bouton "Supprimer" dans la barre bulk. **Fonctionne déjà.**

4. **Suppression individuelle** : déjà présente dans le menu dropdown de chaque produit.

**Ce qui manque :**

- Dans `/admin/produits`, la fiche produit (ProductForm) ne permet pas de définir le **stock par taille** et **stock par couleur** — seulement un stock global.
- Pas d'accès direct depuis la liste produits vers la gestion stock par variante.

---

## Plan

### 1 — Ajouter le stock par variante dans `ProductForm.tsx`

Après la section "TAILLES DISPONIBLES" et "OPTIONS COULEURS", ajouter dynamiquement une section **"// STOCK PAR VARIANTE"** qui s'affiche selon les tailles/couleurs renseignées :

- **Tailles + Couleurs** → grille tableau (couleur en ligne × taille en colonne) avec `Input` number dans chaque cellule
- **Tailles seulement** → liste simple : `XS: [__]  S: [__]  M: [__]` etc.
- **Couleurs seulement** → liste : swatch + nom + `Input`
- **Aucune variante** → champ stock global (déjà présent)

Ces données sont stockées dans `attributes` du produit sous la clé `variantStock` (JSON), ou mieux : on synchronise directement avec `stock_levels` en base de données au moment du save.

**Option retenue** : stocker les stocks variantes dans `stock_levels` (la vraie table) via l'inventaire, exactement comme `InventoryProductDialog` le fait — en réutilisant la même logique dans `handleCreate`/`handleUpdate` d'`AdminProducts.tsx`.

### 2 — Bouton rapide "Gérer stock" depuis la liste produits

Dans le menu dropdown de chaque produit (côté "ACTIONS"), ajouter un item **"Gérer le stock"** qui ouvre `InventoryProductDialog` en mode édition. Il faut juste récupérer l'`inventoryId` correspondant au `productId`.

### 3 — Confirmer que la suppression en masse fonctionne

La suppression en masse est déjà codée (`handleBulkDelete` + `useBulkDeleteProducts`). Elle s'affiche dès qu'un produit est coché. **Aucun changement nécessaire** — juste informer l'utilisateur.

---

## Fichiers à modifier

| Fichier | Action |
|---|---|
| `src/components/admin/ProductForm.tsx` | Ajouter section stock par variante (grille taille×couleur, ou par taille seule, ou couleur seule) |
| `src/pages/admin/AdminProducts.tsx` | (1) Passer les données stock variante lors du create/update vers stock_levels ; (2) Ajouter "Gérer le stock" dans le dropdown → ouvre InventoryProductDialog |

---

## Ce que ça change concrètement

1. **Fiche produit** : dès qu'on coche des tailles ET des couleurs, une grille apparaît pour saisir le stock de chaque combinaison (ex: Noir XL = 10, Noir M = 5, Blanc L = 8…)
2. **Liste produits** → menu "···" → "Gérer le stock" → ouvre directement le dialogue stock complet avec les variantes existantes
3. **Suppression en masse** : déjà fonctionnelle (cocher des produits → barre jaune apparaît avec bouton "Supprimer")
