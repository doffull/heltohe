## Objectif

Ajouter un import CSV de produits (format export WooCommerce déjà fourni) dans `/admin/produits`, avec images, prix, stock, catégories, etc., et un aperçu avant import.

## Flux utilisateur

1. Bouton **"Importer CSV"** dans `AdminProducts.tsx` (à côté du bouton existant d'import).
2. Dialogue **`CsvImportDialog`** :
   - Drop zone pour le fichier `.csv`
   - Parsing local (PapaParse) → tableau prévisualisé (image, nom, SKU, prix, stock, catégorie, statut "nouveau / déjà existant via SKU")
   - Cases à cocher par ligne + "Tout sélectionner"
   - Option : "Mettre à jour les produits existants" (sinon ignorés)
   - Bouton **Importer la sélection**
3. Insertion directe via le client Supabase (table `products`, upsert sur `sku`). Pas d'edge function nécessaire — l'admin a déjà les droits RLS.
4. Toast résumé : X créés, Y mis à jour, Z erreurs.

## Mapping CSV WooCommerce → table `products`

| Colonne CSV | Champ DB |
|---|---|
| `Nom` | `name` |
| `UGS` | `sku` (fallback `wc-{ID}`) |
| `Tarif régulier` | `price` |
| `Tarif promo` | `sale_price` |
| `Stock` | `stock` |
| `Catégories` (1ère valeur) | `category` |
| `Description` (HTML strippé) | `description` |
| `Description courte` | (ignoré ou stocké si champ existe) |
| `Images` (split `,`) | `image` (1ère) + `images` (toutes) |
| `Publié` (1/0) | `is_active` |
| `Étiquettes` | `tags` (array) |
| `Valeur(s) attribut Taille/Size` | `sizes` |
| `Valeur(s) attribut Couleur/Color` | `colors` |
| `Poids (kg)` | `weight` |

Lignes `Type=variation` ignorées (variations agrégées sur le parent via attributs).

## Fichiers

**Nouveaux**
- `src/components/admin/CsvImportDialog.tsx` — dialog avec parsing, prévisualisation, sélection, import
- `src/lib/csvProductMapper.ts` — fonction pure `mapCsvRowToProduct(row)` + détection encodage BOM UTF-8

**Modifiés**
- `src/pages/admin/AdminProducts.tsx` — ajouter bouton "Importer CSV" qui ouvre le dialogue
- `package.json` — ajouter `papaparse` + `@types/papaparse`

## Hors scope

- Pas d'edge function (import client-side suffit, fichier ~500 lignes max)
- Pas de téléchargement/réhébergement des images : on garde les URLs WooCommerce telles quelles (comme déjà fait pour la sync WooCommerce)
- Pas de modification de schéma DB : la table `products` couvre déjà tous les champs nécessaires
- Pas de gestion des variations WooCommerce comme produits séparés
