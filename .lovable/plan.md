

## Plan : Enrichir le tableau Inventaire Global

### Contexte

Le tableau "Inventaire Global" actuel affiche uniquement : Produit (texte), SKU, Canal, Stock Total, Seuil, Statut, Actions. L'image de reference montre qu'il faut ajouter des colonnes pour l'image produit, les tailles, et les pastilles couleur. De plus, il manque la generation IA du SKU/description et le stock par couleur seule.

---

### 1. Enrichir le type ProductRow et la requete

Modifier la requete `products.select(...)` pour inclure `image, description, color_options` en plus de `id, name, sku, sizes, colors`. Mettre a jour le type `ProductRow` en consequence.

---

### 2. Ajouter les colonnes au tableau Inventaire Global

Modifier le `<Table>` dans `InventoryView` pour ajouter ces colonnes :

```text
| Image | Produit | SKU | Canal | Tailles | Couleurs | Stock Total | Seuil | Statut | Actions |
```

- **Image** : Miniature carree (32x32) du produit. Si pas d'image, afficher un placeholder gris.
- **Tailles** : Badges compacts pour chaque taille (XS, S, M, L, etc.)
- **Couleurs** : Pastilles rondes colorees cote a cote (via `ColorSwatch` existant)

---

### 3. Image produit dans le dialog InventoryProductDialog

Ajouter un champ d'upload/URL d'image dans `InventoryProductDialog.tsx` :

- Utiliser `FileDropZone` deja existant pour l'upload d'image
- Champ URL alternatif (comme dans `ProductForm`)
- Stocker dans `form.image` et sauvegarder dans `products.image`
- En mode edition, pre-remplir avec l'image existante

---

### 4. Generation IA du SKU et de la description

Ajouter deux boutons "Generer par IA" a cote des champs SKU et Description :

- **SKU IA** : Generer un SKU a partir du nom et de la categorie (format : 3 lettres categorie + tiret + 3 lettres nom + tiret + compteur). Fait cote client sans appel API, ou via un simple algorithme deterministe.
- **Description IA** : Appeler le modele Lovable AI (google/gemini-2.5-flash-lite) via une edge function pour generer une description courte a partir du nom, categorie, materiau, tailles et couleurs du produit.

---

### 5. Stock par couleur seule dans le dialog

Actuellement le dialog gere :
- Stock global (sans tailles ni couleurs)
- Stock par taille seule
- Stock par taille x couleur

Ajouter le cas manquant :
- **Stock par couleur seule** (couleurs definies mais pas de tailles) : afficher une grille simple couleur/quantite, similaire a la grille taille seule

---

### 6. Pastilles couleur avec selection visuelle dans le dialog

Ameliorer la saisie des couleurs dans `InventoryProductDialog` :

- Afficher une palette de couleurs predefinies cliquables (pastilles rondes) au-dessus du champ texte
- Les couleurs predefinies : BLACK, WHITE, RED, BLUE, NAVY, GREEN, PINK, PURPLE, GREY, BROWN, BEIGE, BURGUNDY, ORANGE, YELLOW, CAMEL, KHAKI
- Cliquer sur une pastille ajoute la couleur directement
- Garder le champ texte pour les couleurs custom

---

### Resume technique

| Element | Modification |
|---|---|
| `AdminStock.tsx` - `ProductRow` | Ajouter `image`, `description`, `color_options` au type et a la requete |
| `AdminStock.tsx` - `InventoryView` table | Colonnes Image (miniature), Tailles (badges), Couleurs (pastilles) |
| `InventoryProductDialog.tsx` | FileDropZone pour image, boutons IA SKU/Description, palette couleurs cliquable, stock par couleur seule |
| Edge function (optionnel) | `generate-product-description` pour la description IA |

### Apercu du tableau enrichi (comme l'image de reference)

```text
+-------+-----------+-----+------+------------------+------------------+-------+-------+--------+---------+
| Image | Produit   | SKU | Canal| Tailles          | Couleurs         | Stock | Seuil | Statut | Actions |
+-------+-----------+-----+------+------------------+------------------+-------+-------+--------+---------+
| [img] | Edge      | edg | BOTH | [XL][XXL][XS][S] | [*][*][*][*]     |  525  |  10   |   OK   | [e][x]  |
| [img] | Frost     | frt | BOTH |                  |                  | 4750  |  10   |   OK   | [e][x]  |
| [img] | Silver    | slv | BOTH |                  |                  | 1900  |  10   |   OK   | [e][x]  |
+-------+-----------+-----+------+------------------+------------------+-------+-------+--------+---------+
[*] = pastilles colorees    [img] = miniature 32x32
```

### Fichiers modifies

- `src/pages/admin/AdminStock.tsx` : enrichir ProductRow, colonnes table, ColorSwatch
- `src/components/admin/InventoryProductDialog.tsx` : image upload, palette couleurs, IA SKU/description, stock par couleur
- `supabase/functions/generate-product-description/index.ts` : edge function pour description IA

