# Suppression totale de la TVA

Les prix produits sont déjà TTC. Aujourd'hui la TVA n'est jamais ajoutée au total : elle est seulement extraite du total (20 % / 1,2) pour affichage et archivage. Cette part de TVA est supprimée partout.

## Ce qui change

- Panier : la ligne « dont TVA (20%) » disparaît du récapitulatif. Total inchangé.
- Tunnel de commande : plus aucun calcul de TVA.
- Commandes enregistrées : le montant de TVA est stocké à 0 (les nouvelles commandes n'affichent plus de TVA). Les totaux facturés restent strictement identiques.

## Détails techniques

- `src/context/CartContext.tsx` : `tax` renvoie 0 (constante `TAX_RATE` retirée), le champ reste exposé pour ne rien casser.
- `src/pages/Cart.tsx` : suppression de la ligne d'affichage TVA.
- `src/pages/Checkout.tsx` : suppression du calcul `tax` inutilisé.
- Base : la fonction `validate_and_create_order` écrit `tax = 0` au lieu de `total * 0.2 / 1.2` (colonne `tax` conservée, aucune commande existante modifiée).
