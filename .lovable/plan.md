
## Diagnostic confirmé

**Problème racine** : 68 produits en base, seulement **1 seul** a une entrée dans la table `inventory`. Les 67 autres (importés depuis WooCommerce ou ajoutés avant la mise en place de l'auto-sync) sont **invisibles** dans Inventaire Global car la vue ne liste que les entrées `inventory`.

La location "Boutique en ligne" (type `web`, id `92a5645b-...`) existe bien.

---

## Plan

### 1 — Migration SQL : synchronisation automatique

Créer une migration qui pour chaque produit **sans entrée inventory** :
1. Insère une ligne dans `inventory` (product_id, sku, name, channel='b2c', threshold=10)
2. Insère une ligne dans `stock_levels` (inventory_id, location_id=web, quantity=product.stock, reserved=0)
3. Si le produit a des `sizes`, insère une ligne par taille avec `quantity = floor(product.stock / nb_sizes)` ou `0` si stock=0

Cela synchronise les 67 produits manquants d'un coup.

### 2 — Bouton "Synchroniser tous les produits" dans l'UI

Dans `AdminStock.tsx` → vue `InventoryView`, ajouter un bouton **"Sync Produits"** qui exécute la même logique côté client pour les produits sans `inventory_id`. Ce bouton sera utile pour les futurs produits ajoutés hors du formulaire admin.

### 3 — Améliorer le formulaire "Ajouter un produit" dans Inventaire Global

Le bouton "Ajouter un produit" dans `InventoryView` ouvre `InventoryProductDialog` — mais celui-ci n'a pas de champ pour les tailles ni les couleurs. Améliorer pour :
- Permettre de choisir un produit **existant** (sans inventaire) depuis une liste déroulante
- OU créer un nouveau produit avec ses variantes
- Lors de la sauvegarde : créer les lignes `stock_levels` par taille et/ou couleur

---

## Fichiers à modifier

| Fichier | Action |
|---|---|
| `supabase/migrations/` | Migration SQL : créer inventory + stock_levels pour tous les produits orphelins |
| `src/pages/admin/AdminStock.tsx` | Ajouter bouton "Sync produits" + logique sync côté client + améliorer dialog "Ajouter" pour lier un produit existant |

---

## Résultat concret

- Immédiatement après la migration : les 67 produits apparaissent dans Inventaire Global avec leur stock actuel
- Le bouton "Sync" garantit que les futurs ajouts (WooCommerce, import CSV) restent toujours visibles
- Le bouton "Ajouter un produit" permet de lier un produit existant OU d'en créer un nouveau avec ses variantes taille/couleur directement depuis l'inventaire
