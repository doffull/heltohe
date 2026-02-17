

## Plan : Ajouter et Modifier des produits dans l'Inventaire Global

### Contexte

Actuellement, la vue "Inventaire Global" affiche un tableau en lecture seule avec un bouton d'import en masse. Il manque la possibilite d'ajouter manuellement un produit a l'inventaire et de modifier les produits existants (nom, SKU, canal, seuil d'alerte, tailles, couleurs, etc.).

---

### 1. Bouton "Ajouter un produit" dans la barre d'actions

Ajouter un bouton "Ajouter un produit" a cote du bouton "Importer fichier" dans `InventoryView`. Ce bouton ouvre un dialog de creation.

---

### 2. Dialog de creation de produit + inventaire

Un dialog complet permettant de :

- Saisir les informations produit : **nom, SKU, prix, categorie, description, materiau**
- Definir les **tailles** (champ texte avec tags : XS, S, M, L, XL, XXL, etc.)
- Definir les **couleurs** (champ texte avec tags + pastilles colorees)
- Choisir le **canal** (B2C, B2B, Les deux)
- Definir le **seuil d'alerte** stock
- Definir un **stock initial** (optionnel, affecte au canal Web par defaut)

A la sauvegarde :
1. INSERT dans `products` (nom, sku, prix, categorie, sizes, colors, etc.)
2. INSERT dans `inventory` (product_id, sku, name, channel, threshold)
3. INSERT dans `stock_levels` avec le stock initial si > 0 (location Web)

---

### 3. Bouton "Modifier" sur chaque ligne du tableau inventaire

Ajouter une colonne "Actions" dans le tableau de l'inventaire global avec :

- **Crayon (Modifier)** : Ouvre le meme dialog en mode edition, pre-rempli avec les donnees du produit
- **Corbeille (Supprimer)** : Confirmation puis suppression de l'inventaire + stock_levels associes

En mode edition :
1. Charger les donnees du produit lie (`products` + `inventory`)
2. Permettre la modification de tous les champs
3. A la sauvegarde : UPDATE `products` + UPDATE `inventory`

---

### 4. Gestion des tailles et couleurs avec tags

Pour les champs tailles et couleurs, implementer un systeme de tags :
- Champ texte ou l'on tape une valeur puis Entree pour ajouter un tag
- Chaque tag peut etre supprime avec un X
- Les couleurs affichent une pastille coloree (via le `COLOR_HEX_MAP` existant)
- Tailles predefinies suggerees : XS, S, M, L, XL, XXL

---

### Resume technique

| Element | Modification |
|---|---|
| `InventoryView` dans `AdminStock.tsx` | Ajout bouton "Ajouter un produit", colonne Actions (modifier/supprimer) |
| Dialog creation/edition | Formulaire complet produit + inventaire avec tags tailles/couleurs |
| Sauvegarde | INSERT/UPDATE coordonne sur `products`, `inventory`, `stock_levels` |
| Suppression | DELETE cascade `stock_levels` puis `inventory` puis `products` |

### Apercu du dialog

```text
+------------------------------------------+
| Ajouter un produit a l'inventaire        |
+------------------------------------------+
| Nom:     [ALICANTE                     ] |
| SKU:     [ALC-001                      ] |
| Prix:    [89.90]   Categorie: [Femme v]  |
| Description: [Veste technique...       ] |
| Materiau:    [Polyester recycl...      ] |
+------------------------------------------+
| Tailles: [XS] [S] [M] [L] [XL] [+]     |
| Couleurs: [*PINK] [*BLACK] [*BLUE] [+]  |
+------------------------------------------+
| Canal: [B2C v]   Seuil alerte: [10]     |
| Stock initial:   [50]                    |
+------------------------------------------+
|              [Annuler] [Sauvegarder]     |
+------------------------------------------+
```

