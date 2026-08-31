# Paiement réel sur helvetica-mp.net (PayPal uniquement)

## Ce qui se passe aujourd'hui

Vérifications faites sur le site en ligne :

- PayPal est bien configuré en **live** (identifiants live présents, webhook enregistré) — les boutons PayPal existent déjà au checkout.
- PayPlug est configuré avec une clé **de test** : les paiements carte via PayPlug ne débitent rien. Les 5 dernières commandes `payplug` sont restées « Pending ».
- Le bouton « CONFIRMER xxx € » crée une commande **sans aucun paiement** (`payment_method: manual`) — c'est ce qui donne l'impression que le site « enregistre » au lieu de faire payer.

## Ce qui va être fait

1. **Supprimer le bouton « CONFIRMER »** du checkout : il n'est plus possible de valider une commande sans payer. Seuls les moyens de paiement restent, avec un message clair si l'adresse ou le point relais manque.
2. **Masquer PayPlug** tant qu'il est en clé de test, pour qu'aucun client ne tombe sur un paiement fictif.
3. **PayPal comme moyen de paiement unique**, avec tous ses tunnels activés : compte PayPal, **carte bancaire sans compte** (invité), 3x/4x sans frais, Apple Pay / Google Pay quand le navigateur le permet.
4. **Fiabiliser le passage « payé »** : après capture PayPal, la commande passe en `payment_status = Paid`, le stock est consommé, l'e-mail de confirmation part, et le panier est vidé. Ajout d'un contrôle serveur de secours si le client ferme la fenêtre pendant la capture.
5. **Vérification de bout en bout** : test réel du parcours (création d'ordre PayPal live, montant recalculé côté serveur, capture, statut de la commande) et contrôle que le webhook PayPal met bien à jour les statuts.
6. **Nettoyage d'affichage** : remplacer la mention « Paiement sécurisé par virement bancaire » du récapitulatif par la vraie mention PayPal / carte, et retirer la référence virement.

Les commandes « manual » et « payplug » déjà en base ne sont pas modifiées ; vous pouvez les annuler depuis Admin → Commandes.

## Détails techniques

- `src/pages/Checkout.tsx` : suppression de `handlePlaceOrder` et du bouton associé, garde-fous déplacés dans `buildPaypalPayload`, masquage conditionnel de `PayPlugCheckout` (affiché seulement si la clé PayPlug est `live`, via l'action `status` de la fonction `payplug`).
- `supabase/functions/paypal/index.ts` : vérification que `capture-order` écrit bien `payment_status = 'Paid'`, `payment_method = 'paypal'`, appelle `consume_order_stock` et déclenche `send-order-confirmation` ; idempotence en cas de double capture.
- `supabase/functions/paypal-webhook/index.ts` : contrôle de la signature et de la mise à jour des statuts (`PAYMENT.CAPTURE.COMPLETED`, `DENIED`, `REFUNDED`).
- Aucune modification de schéma nécessaire.

## Si vous voulez PayPlug plus tard

Il suffira de me transmettre la clé secrète live (`sk_live_…`) depuis votre portail PayPlug : le bouton carte PayPlug réapparaîtra automatiquement.
