

## Plan : Pastilles couleur sur les lignes produit + gestion stock par combinaison taille×couleur

### Problème
Quand on expand un produit dans l'inventaire global, seules les tailles s'affichent comme variantes. Les couleurs du produit ne sont pas visibles sous forme de pastilles sur la ligne parent, et les combinaisons taille×couleur ne sont pas toutes créées comme `stock_levels`.

### Changements prévus dans `src/pages/admin/AdminStock.tsx`

**A. Pastilles couleur sur la ligne parent (entre Produit et Canal)**

Sur chaque ligne produit parent, ajouter une colonne "Couleurs" affichant des pastilles rondes colorées correspondant aux couleurs du produit (`matchedProduct.colors`). Chaque pastille est cliquable et ouvre un petit popover permettant de :
- Voir le stock total pour cette couleur (toutes tailles confondues)
- Modifier rapidement le stock de cette couleur (en un clic, même logique que `VariantStockCell`)

Ajout d'un `TableHead` "Couleurs" dans le header entre "Produit / Variante" et "Canal".

**B. Lignes variantes enfants : afficher taille + couleur avec pastille**

Dans les lignes enfants (variant rows), améliorer `VariantLabelEditor` pour afficher clairement :
- La pastille couleur à gauche
- Le nom de la taille (S, M, L...)
- Le nom de la couleur en texte
- Le crayon d'édition inline (déjà existant)

**C. Sync : créer les combinaisons taille×couleur manquantes**

Le sync (`handleSyncProducts`) crée déjà des combinaisons taille×couleur (lignes 552-561). Ajouter un bouton "Resync variantes" qui, pour les produits déjà en inventaire, crée les `stock_levels` manquants pour les nouvelles combinaisons taille×couleur ajoutées au produit.

**D. Header table : ajouter la colonne Couleurs**

Nouvelle colonne dans le header et dans les rows (parent + enfant).

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/admin/AdminStock.tsx` | Ajouter colonne Couleurs avec pastilles cliquables sur parent rows, améliorer variant rows, ajouter resync variantes |

