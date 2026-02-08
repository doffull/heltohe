

# Tableau de bord avec donnees reelles

## Ce qui sera fait

Remplacement des donnees fictives (mock data) du dashboard admin par des donnees reelles calculees a partir des commandes et produits stockes en base de donnees.

## Donnees qui seront calculees dynamiquement

1. **Graphique "Evolution des ventes"** : Agregation des commandes par mois (total des ventes et nombre de commandes) sur les 12 derniers mois
2. **Graphique "Produits par categorie"** : Comptage reel des produits par categorie depuis la table `products`
3. **Indicateurs de variation** : Comparaison mois en cours vs mois precedent pour calculer les vrais pourcentages de changement (chiffre d'affaires, commandes)

## Details techniques

**Fichier modifie :** `src/pages/admin/AdminDashboard.tsx`

### Changements

- Suppression des constantes `salesData` et `categoryData` en dur
- Ajout de `useMemo` pour calculer :
  - `salesData` : regroupement des commandes par mois (`date-fns` pour formater les mois), calcul du total des ventes et du nombre de commandes par mois sur les 12 derniers mois
  - `categoryData` : `products.reduce()` pour compter les produits par categorie
  - `revenueChange` : pourcentage de variation entre le mois en cours et le mois precedent
  - `ordersChange` : idem pour le nombre de commandes
- Les mois sans commandes apparaitront avec des valeurs a 0 pour garder la continuite du graphique
- Format des mois en francais (Jan, Fev, Mar, etc.)

### Logique d'agregation

```text
orders --> grouper par mois (YYYY-MM) --> pour chaque mois :
  - sales = somme des totaux
  - orders = nombre de commandes
  
products --> grouper par categorie --> pour chaque categorie :
  - count = nombre de produits
```

### Calcul des variations

```text
variation = ((valeur_mois_courant - valeur_mois_precedent) / valeur_mois_precedent) * 100
```

Si aucune donnee le mois precedent, afficher "Nouveau" au lieu d'un pourcentage.

