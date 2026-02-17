

## Plan : Deduire le stock global lors de l'attribution en boutique/site

### Probleme actuel

Quand un produit est ajoute a une boutique via "Ajouter produit", le systeme **cree de nouvelles entrees** `stock_levels` pour la boutique sans toucher au stock global (Web). Le stock est donc **duplique** au lieu d'etre transfere.

Exemple : un produit a 100 unites en stock global Web. On ajoute 30 en boutique Paris. Resultat actuel : Web = 100, Paris = 30 (total 130). Resultat attendu : Web = 70, Paris = 30 (total 100).

---

### 1. Deduire le stock Web lors de l'ajout en boutique

Modifier `handleAddProduct` dans `BoutiquesView` (AdminStock.tsx) :

**Mode global (sans variantes)** :
- Trouver le `stock_level` Web correspondant (meme `inventory_id`, location Web, sans size/color)
- Verifier que `webStock.quantity >= addProductQty`
- Si pas assez de stock : toast d'erreur "Stock insuffisant. Disponible : X, demande : Y"
- Si OK : deduire `webStock.quantity -= addProductQty` puis creer l'entree boutique
- Logger les deux mouvements dans `stock_history` : un `transfer_out` pour Web, un `transfer_in` pour la boutique

**Mode variantes (taille x couleur)** :
- Pour chaque combinaison couleur/taille avec qty > 0, trouver le stock Web correspondant
- Verifier que le stock Web par variante est suffisant
- Si une variante n'a pas assez de stock, bloquer et afficher le detail
- Si OK : deduire chaque variante du Web et creer les entrees boutique

---

### 2. Afficher le stock disponible dans le dialog d'ajout

Modifier le dialog d'ajout de produit en boutique :

**Mode global** :
- Afficher "Stock Web disponible : X" a cote du champ quantite
- Limiter le champ quantite au maximum du stock disponible
- Si la quantite saisie depasse le stock Web : afficher un message d'alerte

**Mode variantes** :
- Pour chaque cellule de la grille couleur x taille, afficher le stock Web disponible en tooltip ou sous-texte
- Empecher de saisir plus que le stock Web disponible

---

### 3. Validation negative couverte

Les validations existantes (`if (newQty < 0)` dans `handleCellSave`, `handleUpdateStock`, et `Math.max(0, val)` dans le dialog) sont deja en place. Ce plan les conserve.

---

### 4. Mouvements d'historique enrichis

Les logs `stock_history` seront adaptes pour distinguer :
- `transfer_out` : deduction du stock Web (avec location Web)
- `transfer_in` : ajout au stock boutique (avec location boutique)
- Au lieu de l'unique `add` actuel

---

### Resume technique

| Element | Modification |
|---|---|
| `AdminStock.tsx` - `handleAddProduct` mode global | Trouver stock Web, verifier suffisance, deduire, creer boutique, logger 2 mouvements |
| `AdminStock.tsx` - `handleAddProduct` mode variantes | Idem par combinaison couleur/taille |
| `AdminStock.tsx` - dialog ajout produit | Afficher stock Web dispo, limiter saisie, alertes |
| `AdminStock.tsx` - `stock_history` | Actions `transfer_out` / `transfer_in` |

### Fichiers modifies

- `src/pages/admin/AdminStock.tsx` : logique de deduction + UI du dialog

