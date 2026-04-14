

## Plan : Système de validation des commandes amélioré avec vérification IA et notifications SMS/Email

### Objectif
Créer un processus de validation en 3 étapes avec vérification IA des informations client, validation manuelle du paiement, puis notification automatique au client (email et/ou SMS). Ajouter une page admin dédiée pour configurer ce processus.

### Architecture

```text
Flux de validation :
1. Identité → IA vérifie email/téléphone/adresse/nom → badge vert/orange/rouge
2. Paiement → Admin valide manuellement → badge vert
3. Notification → Email + SMS automatique au client → badge vert
```

### Changements prévus

**A. Nouvelle table `notification_config` (migration)**

Stocke les préférences de notification de l'admin :
- `config_key` (text, unique, default 'main')
- `notify_on_identity_verified` (boolean) — notifier quand identité vérifiée
- `notify_on_payment_verified` (boolean) — notifier quand paiement validé
- `notify_on_all_validated` (boolean) — notifier quand tout est OK
- `notification_channels` (jsonb) — `{email: true, sms: false}`
- `sms_provider` (text) — 'twilio' ou null
- `sms_from_number` (text) — numéro expéditeur
- `email_templates` (jsonb) — templates personnalisables pour chaque étape
- `sms_templates` (jsonb) — templates SMS pour chaque étape
- RLS : admin only pour ALL, pas de SELECT public

**B. Nouvelle Edge Function `verify-customer-info`**

Appelle l'IA (Lovable AI Gateway) pour vérifier les informations client :
- Valide le format email (regex + pattern IA)
- Vérifie la cohérence nom/adresse/code postal/ville (via IA)
- Vérifie le format du numéro de téléphone
- Retourne un score de confiance + détails des problèmes détectés
- Utilise `google/gemini-2.5-flash` pour l'analyse

**C. Nouvelle Edge Function `send-order-notification`**

Gère l'envoi de notifications :
- Email via Resend (déjà configuré)
- SMS via Twilio (si connecté) — demandera la connexion du connecteur Twilio
- Lit la config depuis `notification_config`
- Templates dynamiques avec variables (nom, n° commande, statut)

**D. Nouvelle page admin `AdminNotifications.tsx` (`/admin/notifications`)**

Section dédiée avec tabs :
- **Canal** : Activer/désactiver email et SMS, configurer le numéro SMS
- **Templates** : Personnaliser les messages pour chaque étape (identité validée, paiement OK, commande complète)
- **Déclencheurs** : Choisir quand notifier (à chaque étape ou seulement à la fin)
- **Historique** : Log des notifications envoyées (lecture depuis `notification_log`)

**E. Modification de `AdminOrders.tsx`**

- Bouton "Identité" : au clic, appelle `verify-customer-info` → affiche résultat IA (vert = OK, orange = doute, rouge = erreur) dans un popover
- Si l'IA valide, le flag passe automatiquement à `true`
- Si doute, l'admin peut forcer la validation ou corriger les infos
- Quand un flag passe à `true`, vérifie la config notification et envoie si activé
- Quand les 3 flags sont validés, envoie la notification finale automatiquement

**F. Nouvelle table `notification_log` (migration)**

Historique des notifications :
- `order_id`, `channel` (email/sms), `type` (identity/payment/complete), `status` (sent/failed), `sent_at`, `recipient`
- RLS : admin only

**G. Mise à jour du routing admin**

- Ajouter `AdminNotifications` dans `Admin.tsx` (sidebar + routes)
- Icône `Bell` dans la sidebar

### Fichiers créés/modifiés

| Fichier | Action |
|---|---|
| Migration SQL | Créer `notification_config` + `notification_log` |
| `supabase/functions/verify-customer-info/index.ts` | Créer — vérification IA |
| `supabase/functions/send-order-notification/index.ts` | Créer — envoi email/SMS |
| `src/pages/admin/AdminNotifications.tsx` | Créer — page config notifications |
| `src/hooks/useNotificationConfig.ts` | Créer — hook CRUD config |
| `src/pages/admin/AdminOrders.tsx` | Modifier — intégrer vérification IA + notifications auto |
| `src/pages/admin/Admin.tsx` | Modifier — ajouter route + sidebar |

### Note sur le SMS
L'envoi de SMS nécessite Twilio. Le connecteur Twilio sera proposé lors de l'activation du SMS dans la page de configuration. Si l'utilisateur n'active pas le SMS, seul l'email sera disponible (déjà fonctionnel via Resend).

