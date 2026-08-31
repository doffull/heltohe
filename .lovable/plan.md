# Plan : Webhook PayPal fonctionnel

## Contexte vérifié
- La fonction `paypal` capture les paiements en synchrone (action `capture-order`) : déstockage + e-mail de confirmation se font déjà **sans webhook**.
- L'admin `AdminPayPal.tsx` affiche déjà une URL webhook copiable :
  `${VITE_SUPABASE_URL}/functions/v1/paypal-webhook` (ligne 50, champ lecture-seule + bouton copier, ligne 591–596).
- L'admin a déjà un champ **Webhook ID** sauvegardé dans `paypal_config.webhook_id` (via `usePayPalConfig.ts`).
- La table `paypal_webhook_events` existe déjà (log idempotent par `event_id`).
- **Manquant** : la fonction Edge `paypal-webhook` n'existe pas. L'URL affichée renvoie donc aujourd'hui un 404/erreur.

## Objectif
Créer une fonction Edge dédiée `paypal-webhook` qui vérifie la signature PayPal, journalise chaque événement et traite les cas de capture/remboursement, puis donner l'URL exacte à coller dans PayPal Developer.

## Étapes

### 1. Créer `supabase/functions/paypal-webhook/index.ts`
Fichier dédié (logique PayPal dupliquée minimale : `credsFor`, `accessToken`, `paypalFetch` — on ne peut pas importer `../paypal` car il ne se déploie pas avec la fonction).

- `OPTIONS` → CORS 200.
- POST :
  1. Détecter un appel webhook par la présence de l'en-tête `PAYPAL-TRANSMISSION-ID`. Sinon → 200 `{ ok: false, reason: "not a webhook" }` (ou 404) pour ne pas exposer d'erreur.
  2. Charger `paypal_config.main` → `environment` + `webhook_id`.
  3. Vérification de signature via l'API PayPal
     `POST /v1/notifications/verify-webhook-signature` avec :
     `auth_algo`, `cert_url`, `transmission_id`, `transmission_sig`, `transmission_time`, `webhook_id` et le `body` brut de la requête.
  4. Si `verification_status !== "SUCCESS"` → loguer l'événement `verification_status=FAILED` et renvoyer 200 (ne pas faire 4xx : PayPal réessaierait inutilement).
  5. Journaliser de façon idempotente dans `paypal_webhook_events` (upsert sur `event_id` ; marquer `processed` ensuite).
  6. Traiter les événements :
     - `PAYMENT.CAPTURE.COMPLETED` → si la commande n'est pas déjà `paid`, la passer `paid` + `processing`, appeler `consume_order_stock`, envoyer l'e-mail de confirmation (réutilise `send-order-confirmation`). Mettre à jour `paypal_transactions` (capture_id, statut).
     - `PAYMENT.CAPTURE.DENIED` → marquer commande `payment_status=failed`, statut `cancelled`.
     - `PAYMENT.CAPTURE.REFUNDED` / `PAYMENT.CAPTURE.REVERSED` → mettre à jour `paypal_transactions.refunded_amount`/`status` et `orders.payment_status` (`refunded` ou `partially_refunded`).
     - autres événements → simplement journalisés.
  7. Renvoyer 200 dans tous les cas après vérification (évite les retries PayPal), avec `{ ok: true, event_type }`.
- CORS headers inclus sur toutes les réponses.
- `verify_jwt = false` (ajout dans `config.toml` sous `[functions.paypal-webhook]`).

### 2. Déployer la fonction
Via `supabase--deploy_edge_functions` (path `paypal-webhook`).

### 3. Fournir l'URL exacte au client
URL = `${VITE_SUPABASE_URL}/functions/v1/paypal-webhook` — déjà affichée et copiable dans **Admin → PayPal → Webhooks**. Je la communiquerai explicitement en chat.

### 4. Instructions à donner au client (PayPal Developer)
- My Apps & Credentials → (Live ou Sandbox) → **Add Webhook**.
- Coller l'URL `paypal-webhook`.
- Événements à souscrire :
  - `Checkout order approved`
  - `Payment capture completed`
  - `Payment capture denied`
  - `Payment capture refunded`
  - `Payment capture reversed`
- Après création, copier le **Webhook ID** renvoyé par PayPal et le coller dans **Admin → PayPal → Webhooks → Webhook ID**, puis enregistrer (nécessaire pour la vérification de signature).

## Note sur la sécurité / clés
Aucune clé secrète ajoutée : la fonction réutilise les `PAYPAL_*_CLIENT_ID/SECRET` déjà stockés. Le `webhook_id` provient de `paypal_config` (saisi côté admin). Aucun identifiant n'est renvoyé au client par le webhook.

## Non-modifié
- Flux de capture synchrone actuel inchangé (le webhook agit en filet de sécurité idempotent, pas en remplacement).
- Interface admin déjà prête : seul le code serveur est ajouté.
