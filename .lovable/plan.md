

## Plan : Import en masse, Gestion boutiques et Bons de livraison

Ce plan couvre 4 fonctionnalites majeures dans le module `/admin/stock` :

---

### 1. Import produits en masse (PDF + XLS/CSV)

**Edge Function** : Modifier `parse-products-pdf` pour accepter aussi les fichiers XLS/CSV en plus du PDF. L'IA (Gemini) extraira les produits depuis n'importe quel format.

**Fichiers modifies :**
- `supabase/functions/parse-products-pdf/index.ts` : Renommer en logique "parse-products-file", accepter `fileBase64` + `fileType` (pdf, csv, xlsx). Pour CSV/XLS, envoyer le contenu texte a l'IA. Pour PDF, garder la logique actuelle.
- `src/pages/admin/AdminStock.tsx` : Ajouter un bouton "Importer fichier" dans la vue Inventaire qui ouvre un dialog d'import (similaire a celui de `AdminProducts.tsx`). Accepter `.pdf`, `.csv`, `.xlsx`, `.xls`. Afficher la liste extraite avec selection, puis creer les produits + les entrees inventaire + stock_levels correspondants.

---

### 2. Gestion complete des boutiques (CRUD)

Ajouter dans la vue "Boutiques" de `AdminStock.tsx` :

- **Ajouter une boutique** : Dialog avec nom, ville, adresse, type (boutique/web/b2b), statut actif
- **Modifier une boutique** : Meme dialog en mode edition
- **Supprimer une boutique** : Confirmation avant suppression (avec verification qu'aucun stock n'est lie)

**Fichiers modifies :**
- `src/pages/admin/AdminStock.tsx` : Ajouter les dialogs CRUD dans `BoutiquesView` avec boutons d'action sur chaque carte boutique

---

### 3. Gestion des produits par boutique (references, variations, stock)

Enrichir la vue detail d'une boutique selectionnee :

- **Tableau editable** : Pour chaque produit dans la boutique, afficher SKU, nom, quantite, reserve, et permettre la modification inline de la quantite
- **Ajouter un produit** : Selectionner un produit de l'inventaire et l'affecter a la boutique avec une quantite initiale (INSERT dans `stock_levels`)
- **Supprimer un produit d'une boutique** : Retirer l'entree `stock_levels` correspondante
- **Variations** : Afficher les tailles/couleurs du produit lie si disponibles

**Fichiers modifies :**
- `src/pages/admin/AdminStock.tsx` : Enrichir la section detail boutique avec boutons Ajouter/Modifier/Supprimer sur chaque ligne du tableau

---

### 4. Bons de livraison par boutique

Ajouter un bouton "Generer bon de livraison" sur chaque boutique qui :

- Genere un document HTML/PDF listant toutes les references de la boutique
- Inclut : nom boutique, date, adresse, liste complete des produits (SKU, nom, quantite, reserve, disponible)
- Ouvre dans une nouvelle fenetre pour impression (`window.print()`)

**Fichiers modifies :**
- `src/pages/admin/AdminStock.tsx` : Ajouter une fonction `generateDeliveryNote` dans `BoutiquesView` qui ouvre une fenetre avec le bon de livraison formate

---

### Resume technique

| Composant | Action |
|---|---|
| `supabase/functions/parse-products-pdf/index.ts` | Accepter CSV/XLS en plus du PDF |
| `supabase/config.toml` | Aucun changement (function deja configuree) |
| `src/pages/admin/AdminStock.tsx` | Import en masse, CRUD boutiques, gestion produits par boutique, bons de livraison |

### Flux d'import en masse

```text
+------------------+     +-------------------+     +------------------+
| Upload fichier   | --> | Edge Function     | --> | Liste extraite   |
| (PDF/CSV/XLS)    |     | (IA Gemini)       |     | avec selection   |
+------------------+     +-------------------+     +------------------+
                                                          |
                                                          v
                                              +------------------------+
                                              | Creation :             |
                                              | 1. products (table)    |
                                              | 2. inventory (table)   |
                                              | 3. stock_levels        |
                                              +------------------------+
```

### Bon de livraison (apercu structure)

```text
+------------------------------------------+
| BON DE LIVRAISON                         |
| Boutique: CC Parly 2 - Le Chesnay       |
| Date: 17/02/2026                         |
| Adresse: Centre Commercial Parly 2      |
+------------------------------------------+
| SKU         | Produit        | Qte | Dispo |
|-------------|----------------|-----|-------|
| THORENS-001 | THORENS        |  45 |    42 |
| EDG-HIM-001 | Himalaya       |  22 |    22 |
| ...         | ...            | ... |  ...  |
+------------------------------------------+
| Total references: 4                      |
| Total unites: 120                        |
+------------------------------------------+
```

