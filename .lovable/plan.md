## Plan : Sécurisation et UX des rôles équipe

### Contexte

Le système de rôles `admin` / `stock_manager` / `preparator` existe déjà (table `user_roles`, fonction `has_role`, table `role_audit_log` et fonction `audit_role_change`). Manquent :
1. Le **trigger d'audit** sur `user_roles` (la fonction existe mais n'est attachée à aucune table).
2. Une **notification** envoyée à l'utilisateur quand on lui attribue un rôle équipe.
3. Des **badges visuels** sur la fiche et la liste clients.
4. Un **accès aux écrans `/admin/preparations` et `/admin/stock`** ouvert au-delà de l'admin uniquement (`stock_manager`, `preparator`).

### 1. Migration SQL

- Attacher le trigger `audit_role_change` (déjà existant) à `user_roles` AFTER INSERT/UPDATE/DELETE.
- Créer une vue `user_roles_with_email` (security_invoker=on) admin-only pour afficher la liste des rôles côté listing client (évite N+1 requêtes).
- Étendre la RPC `list_users_by_role` pour inclure first_name/last_name (utile pour l'email).

### 2. Notification d'attribution de rôle

Ajouter dans l'Edge Function `send-order-notification` (ou réutiliser le même pattern) un nouveau type `role_assigned` :
- Sujet : « LVTK6 — Nouveau rôle attribué : {role_label} »
- Corps : explique le rôle, lien vers `/admin/preparations` (stock_manager / preparator) ou `/admin` (admin)
- Destinataire : email récupéré via `customers` puis `auth.users`

Côté frontend (`AdminCustomers.tsx > RoleManager`), après chaque `insert` réussi sur `user_roles`, appeler `supabase.functions.invoke('send-order-notification', { body: { notificationType: 'role_assigned', userId, role, customerEmail, customerName } })`.

Toast : « Rôle attribué et utilisateur notifié par email ».

### 3. Audit visible (read-only)

- Pas de nouvelle UI dédiée — le journal sera consultable depuis `AdminAudit` existant via une nouvelle section « Historique des rôles » (tableau : date, qui, opération INSERT/DELETE, cible, rôle).
- Lecture via `role_audit_log` (RLS admin-only déjà en place).

### 4. Contrôle d'accès écrans stock & préparation

Actuellement `Admin.tsx` exige `isAdmin`. Pour autoriser `stock_manager` et `preparator` à accéder uniquement à leurs écrans :

- Étendre `AuthContext` : ajouter `roles: AppRole[]` + helpers `isStockManager`, `isPreparator`, `hasAnyAdminAccess`.
- Modifier `Admin.tsx` :
  - Acceptation de l'entrée si `hasAnyAdminAccess` (admin OU stock_manager OU preparator).
  - Filtrer `SIDEBAR_ITEMS` selon le rôle :
    - `admin` → tout
    - `stock_manager` → Dashboard, Commandes, Préparations, Stock
    - `preparator` → Préparations uniquement
  - Bloquer les routes non autorisées par un `<Navigate>` dans chaque page sensible.
- `AdminPreparations.tsx` : le filtre RLS existant fait déjà le travail côté DB ; ajouter un garde UI selon le rôle.
- `AdminStock.tsx` : autoriser `stock_manager` (lecture seule possible — pour la phase 1, on laisse l'écriture admin only via RLS existante).

### 5. Badges de rôle

- **Fiche client (Dialog)** : `RoleManager` affiche déjà les checkboxes — ajouter en en-tête de la fiche les badges actuels colorés (rouge admin, ambre stock, vert préparateur).
- **Liste clients (table)** : nouvelle colonne « RÔLES » entre EMAIL et NIVEAU, avec petits badges. Données chargées en une seule requête depuis `user_roles` (group by user_id) via un `useUserRoles()` hook React Query.

### 6. Dette technique / failles invisibles à corriger en passant

- `auto_create_inventory_on_product_insert` : aucun trigger attaché ? À vérifier (séparé du présent ticket si non).
- `audit_role_change` : sera maintenant attaché ✅
- Aucune autre faille bloquante détectée — RLS strict sur tables sensibles déjà en place (mémoire sécurité existante).

### Fichiers modifiés / créés

| Fichier | Type | Changement |
|---|---|---|
| Migration SQL | nouveau | trigger audit `user_roles`, vue rôles+email |
| `supabase/functions/send-order-notification/index.ts` | edit | type `role_assigned` + lookup email destinataire |
| `src/context/AuthContext.tsx` | edit | charger tous les rôles, exposer helpers |
| `src/pages/admin/Admin.tsx` | edit | accès multi-rôle, sidebar filtré |
| `src/pages/admin/AdminCustomers.tsx` | edit | colonne badges + badges en-tête fiche + invoke notif |
| `src/pages/admin/AdminAudit.tsx` | edit | section « Historique des rôles » |
| `src/hooks/useUserRoles.ts` | nouveau | hook batch chargement des rôles |
| `src/pages/admin/AdminPreparations.tsx` | edit | garde UI léger selon rôle |

### Question

Le **template de l'email d'attribution** doit-il être configurable depuis `/admin/notifications` (comme les autres templates) ou hardcodé en français dans l'Edge Function pour simplifier ? Je propose **hardcodé** (1 seul template, peu de variables) sauf si tu préfères pouvoir le personnaliser.
