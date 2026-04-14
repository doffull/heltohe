

## Plan : Variantes couleurs dans l'inventaire + Colonnes réordonnées + Menu compact

### Contexte
Le dialog d'édition d'inventaire (`InventoryProductDialog`) affiche déjà les tailles ET les couleurs en mode création, mais en mode édition les couleurs ne sont pas modifiables inline. De plus, le tableau d'inventaire global affiche une colonne SKU inutile et les colonnes ne sont pas dans l'ordre souhaité.

### Changements prévus

**A. InventoryProductDialog — Variantes couleurs en édition**
- Le dialog affiche déjà les sections tailles et couleurs en mode création
- En mode **édition**, la grille de stock par variante (couleur × taille) n'est pas affichée — seules les tailles/couleurs sont modifiables comme liste
- Les tailles et couleurs sont déjà éditables en mode édition (ajout/suppression avec warning de stock)
- Pas de changement majeur nécessaire ici, le dialog fonctionne correctement

**B. Tableau Inventaire Global — Réordonner les colonnes et supprimer SKU**

Ordre actuel : Chevron | Image | Produit | **SKU** | Canal | Web | Boutiques | Total | Seuil | Statut | Actions

Nouvel ordre demandé : Chevron | **Image** | **Produit** | **Canal** | **Web** | **Boutiques** | **Total** | **Seuil** | **Statut** | Actions

- Supprimer la colonne SKU du header et des rows (parent + variant)
- Réorganiser les colonnes dans l'ordre demandé
- Supprimer aussi le SKU des lignes de variantes enfants

**C. Variantes dans le tableau — Afficher tailles ET couleurs**

Actuellement, quand on expand un produit, les variantes montrent taille et/ou couleur. C'est déjà fonctionnel. Le problème signalé est que la **sync produits** (`handleSyncProducts`) ne crée des `stock_levels` que pour les tailles, pas les couleurs :

```typescript
// Actuel (ligne ~490) — ne crée que des lignes par taille
if (p.sizes && p.sizes.length > 0) {
  for (const size of p.sizes) {
    await supabase.from('stock_levels').insert({ ..., size, color: null });
  }
}
```

Correction : créer des `stock_levels` pour chaque combinaison taille × couleur (ou couleur seule si pas de tailles).

**D. Modification rapide des variantes en un clic**

Le `VariantStockCell` permet déjà l'édition inline du stock au clic. Ajouter la possibilité de **modifier la taille/couleur** d'une variante directement depuis la ligne du tableau (petit bouton d'édition inline à côté du label de variante).

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/admin/AdminStock.tsx` | Supprimer colonne SKU, réordonner colonnes, corriger sync pour créer variantes couleur, ajouter édition inline taille/couleur sur les lignes variantes |

