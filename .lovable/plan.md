
## Analyse

L'utilisateur demande où trouver le paramètre "admin notification email". La fonctionnalité n'existe pas encore — le secret `ADMIN_NOTIFICATION_EMAIL` n'a pas été créé (l'outil n'a pas été approuvé dans le message précédent), et la fonction `send-order-confirmation` n'envoie actuellement qu'un seul email au client.

Il faut :
1. Ajouter le champ email de notification admin dans `AdminSettings.tsx` (onglet Général) — configurable depuis l'interface
2. Stocker cet email dans les `design_settings` ou dans la table `app_settings` existante
3. Modifier `send-order-confirmation/index.ts` pour lire l'email admin et envoyer un 2e email de notification avec template dédié (récapitulatif commande + lien direct admin)

### Approche : stocker l'email admin dans design_settings
C'est la solution la plus simple — `designSettings` est déjà utilisé partout, il suffit d'ajouter un champ `adminNotificationEmail`.

### Plan d'implémentation

**1. `src/pages/admin/AdminSettings.tsx`** — onglet Général
- Ajouter un champ "Email de notification admin" avec sauvegarde via `updateDesignSettings`
- Afficher l'info contextuelle : "Cet email recevra une copie de chaque nouvelle commande"

**2. `supabase/functions/send-order-confirmation/index.ts`**
- Accepter un nouveau champ `adminEmail` dans le payload (optionnel)
- Si présent, envoyer un 2e email Resend avec template admin spécifique :
  - Bandeau rouge "NOUVELLE COMMANDE"
  - Infos client complètes (nom, email)
  - Récapitulatif articles
  - Total + mode livraison
  - Bouton "Voir la commande dans l'admin" → lien `https://lvatk6000art.lovable.app/admin/commandes`

**3. `src/pages/Checkout.tsx`** (ou le hook qui appelle la fonction)
- Passer l'`adminEmail` depuis `designSettings` lors de l'appel à `send-order-confirmation`

### Fichiers modifiés
| Fichier | Action |
|---|---|
| `src/pages/admin/AdminSettings.tsx` | Ajouter champ email notif admin dans l'onglet Général |
| `supabase/functions/send-order-confirmation/index.ts` | Ajouter envoi 2e email admin |
| `src/pages/Checkout.tsx` | Passer adminEmail dans le payload |

C'est un plan propre, sans nouveau secret nécessaire — l'email admin est configurable directement dans l'interface admin.
