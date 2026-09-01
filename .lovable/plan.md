# PayPlug : module de configuration propre (clé secrète unique)

## Objectif
Ne garder que deux moyens de paiement — PayPal et PayPlug — et remplacer le formulaire PayPlug actuel (clé publique + clé secrète) par un module dédié où l'on saisit uniquement la clé API secrète (test ou live), avec validation et vérification réelle auprès de PayPlug.

## Ce qui change

### 1. Nettoyage des passerelles
- Suppression de Stripe, Mollie, Klarna et Virement bancaire de la liste des passerelles.
- Il ne reste que PayPal et PayPlug dans Admin → Checkout → Paiement.
- Les clés éventuellement enregistrées pour les passerelles supprimées sont retirées côté serveur (liste blanche réduite à `paypal` et `payplug`).

### 2. Module PayPlug dédié
Nouveau bloc dans l'onglet Paiement, à la place de la carte générique :
- Un seul champ : **Clé API secrète** (`sk_test_…` ou `sk_live_…`), masqué à la saisie.
- Détection automatique du mode : badge « Mode TEST » ou « Mode LIVE » selon le préfixe de la clé.
- Bouton **Enregistrer et vérifier** : la clé est stockée côté serveur (jamais renvoyée au navigateur) puis testée immédiatement auprès de l'API PayPlug.
- Résultat affiché clairement : clé valide (mode, 4 derniers caractères, date), ou message d'erreur explicite (clé refusée, compte non activé, format invalide).
- Bouton **Retester** et bouton **Supprimer la clé**.
- Avertissement visible si la clé enregistrée est une clé de test alors que la passerelle est activée sur le site.
- Le champ « Clé API publique » disparaît pour PayPlug (PayPlug n'en fournit pas).

### 3. Vérification côté serveur
Ajout d'une action de vérification dans la fonction PayPlug : appel authentifié à l'API PayPlug pour confirmer que la clé est acceptée et récupérer le mode (test/live) et, si disponible, l'état d'activation du compte (paiement live autorisé, 3-D Secure). Réservé aux administrateurs.

### 4. Affichage boutique
Le bouton de paiement carte PayPlug au checkout continue d'afficher « Mode test » seulement si la clé enregistrée est une clé test ; avec une clé `sk_live_…` la mention disparaît automatiquement.

## Détails techniques
- `src/hooks/useCheckoutConfig.ts` : `PAYMENT_GATEWAYS` réduit à `paypal` + `payplug`, `publicKey` non utilisé pour PayPlug ; la fusion des méthodes enregistrées ignore les clés obsolètes.
- `supabase/functions/payment-keys/index.ts` : `ALLOWED_GATEWAYS = ["paypal", "payplug"]`, validation du format de la clé PayPlug (`sk_test_`/`sk_live_`).
- `supabase/functions/payplug/index.ts` : nouvelle action `verify` (admin uniquement) appelant l'API PayPlug avec la clé stockée ; réponse `{ valid, mode, message }`.
- `src/pages/admin/AdminCheckout.tsx` : extraction d'un composant `PayPlugKeyCard` (nouveau fichier sous `src/components/admin/`) rendu pour la passerelle PayPlug ; carte générique conservée pour PayPal.
- Aucune migration de base nécessaire ; la table `payment_gateway_secrets` est réutilisée telle quelle.
