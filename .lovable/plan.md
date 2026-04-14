

## Plan : Actions groupées de validation sur les commandes

### Objectif
Ajouter dans la barre d'actions groupées (qui apparaît quand des commandes sont sélectionnées) trois nouveaux boutons :
1. **Vérifier identité en masse** — appelle `verify-customer-info` pour chaque commande sélectionnée
2. **Valider paiement en masse** — marque le flag `payment` à `true` + payment_status = Paid
3. **Valider expédition en masse** — marque le flag `shipping` à `true`

Chaque action envoie les notifications configurées et vérifie si les 3 flags sont complets.

### Changements dans `src/pages/admin/AdminOrders.tsx`

**A. Nouvelles fonctions bulk**

- `handleBulkAIVerify` : boucle sur les commandes sélectionnées, appelle `verify-customer-info` pour chacune, met à jour le flag `identity` si score >= 80, envoie notifications. Affiche un toast récapitulatif (X vérifiées / Y échouées).
- `handleBulkValidatePayment` : boucle sur les commandes sélectionnées, met à jour `validation_flags.payment = true` + `payment_status = Paid`, envoie notifications.
- `handleBulkValidateShipping` : boucle sur les commandes sélectionnées, met à jour `validation_flags.shipping = true` + `status = Shipped`, envoie notifications.

Chaque fonction vérifie après mise à jour si les 3 flags sont complets → envoie `all_validated`.

**B. État de chargement**

Ajouter un state `bulkProcessing` (string | null) pour afficher un loader sur le bouton en cours.

**C. Barre d'actions groupées enrichie**

Dans le bloc `{someSelected && ...}` (lignes 509-516), ajouter les 3 boutons :
- `ShieldCheck` + "Vérifier IA" (appelle `handleBulkAIVerify`)
- `DollarSign` + "Valider paiement" (appelle `handleBulkValidatePayment`)
- `Send` + "Valider expédition" (appelle `handleBulkValidateShipping`)

### Fichier modifié

| Fichier | Changement |
|---|---|
| `src/pages/admin/AdminOrders.tsx` | Ajouter 3 fonctions bulk + 3 boutons dans la barre d'actions groupées |

