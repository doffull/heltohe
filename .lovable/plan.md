## Objectif

Étendre l'édition en masse existante dans `/admin/produits` (actuellement limitée à catégorie + prix + stock uniformes) pour couvrir tous les champs demandés, avec ajustements avancés, édition inline directe dans le tableau, modale dédiée et import/export CSV rapide prix/stock.

## Ce qui existe déjà (à conserver)

- Sélection multiple via `useBulkSelection` + barre d'actions groupées.
- Hooks `useBulkUpdateProducts` / `useBulkDeleteProducts`.
- `CsvImportDialog` complet (import produits WooCommerce).
- Édition inline stock via `InlineStockEditor` (sur AdminStock, pas sur AdminProducts).

## Ce qui sera ajouté

### 1. Édition inline dans le tableau produits (`AdminProducts.tsx`)

Rendre directement modifiables au clic les cellules :
- **Prix** et **prix promo** (double champ dans la cellule PRIX)
- **Stock**
- **SKU**
- **Catégorie** (select)
- **Actif/inactif** (toggle badge)

Comportement : click → champ input, Enter/blur → mutation `updateProduct` (partielle, sans écraser la galerie grâce au patch `appToDbProduct` déjà en place). Feedback discret (spinner + toast). Un état local évite le flicker pendant la mutation.

Ajout des colonnes manquantes dans l'en-tête : `PRIX PROMO`, `ACTIF`.

### 2. Modale d'édition en masse dédiée (`BulkEditDialog.tsx`)

Nouveau composant remplaçant la barre inline actuelle (bouton "Édition en masse" dans la barre d'actions). Contient pour chaque champ un sélecteur d'opération :

```text
Prix        [ Inchangé | Fixer à X€ | +X€ | −X€ | +X% | −X% | Arrondir ]
Prix promo  [ Inchangé | Fixer | +/−€ | +/−% | Supprimer ]
Stock       [ Inchangé | Fixer | +X | −X | Mettre à 0 ]
SKU         [ Inchangé | Préfixer | Suffixer | Remplacer texte ]
Catégorie   [ Inchangée | Sélectionner ]
Tags        [ Inchangés | Ajouter | Retirer | Remplacer ]
Actif       [ Inchangé | Activer | Désactiver ]
```

Aperçu "Avant → Après" sur les 5 premiers produits sélectionnés avant validation. Application via `bulkUpdate.mutateAsync` en batch (calcul côté client, envoi ligne par ligne car les ajustements dépendent de la valeur actuelle).

### 3. Import/Export CSV prix/stock rapide

Deux boutons dans la barre d'outils AdminProducts :

- **Exporter CSV (sélection ou tout)** : télécharge `sku,name,price,sale_price,stock,is_active` pour les produits filtrés/sélectionnés.
- **Importer CSV rapide** : nouvelle modale `QuickPriceStockImportDialog.tsx` qui accepte un CSV avec colonnes `sku` + une ou plusieurs de `price,sale_price,stock,is_active`. Aperçu diff avant/après par ligne, puis upsert par SKU via `useBulkUpdateProducts` étendu (matching SKU → id).

Cet outil est distinct de `CsvImportDialog` : il ne crée pas de produits, il met à jour uniquement les champs prix/stock/actif sur les SKU existants.

### 4. Extension mineure du hook `useBulkUpdateProducts`

Aujourd'hui il applique `updates` identiques à tous les IDs. On ajoute une variante `bulkUpdatePerRow(rows: {id, updates}[])` pour l'édition en masse avec ajustements (chaque produit ayant ses valeurs calculées).

## Détails techniques

- `appToDbProduct` (déjà partiel) garantit que la galerie et autres champs ne sont pas écrasés.
- L'édition inline utilise `useUpdateProduct` existant.
- Le CSV rapide réutilise `papaparse` déjà présent (`CsvImportDialog`).
- Aucun changement de schéma DB nécessaire — colonnes visées existent déjà (`price`, `sale_price`, `stock`, `sku`, `category`, `is_active`, `tags`).
- Sécurité : les mises à jour passent par les policies RLS existantes sur `products` (admin required).

## Fichiers touchés

- **Nouveau** `src/components/admin/BulkEditDialog.tsx`
- **Nouveau** `src/components/admin/QuickPriceStockImportDialog.tsx`
- **Modifié** `src/pages/admin/AdminProducts.tsx` : cellules inline, boutons export/import rapide, remplacement barre bulk par bouton ouvrant `BulkEditDialog`.
- **Modifié** `src/hooks/useProducts.ts` : ajout `useBulkUpdatePerRow`.

## Hors périmètre

- Pas de changement DB.
- Pas d'ajout de webhooks/edge functions.
- L'existant `CsvImportDialog` (import produits complets) reste inchangé.