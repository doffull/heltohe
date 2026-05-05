## Plan : Réservation stock & workflow de préparation après validation paiement

### Objectif
Quand le **paiement** d'une commande est validé (3e étape), automatiquement :
1. **Réserver le stock** des produits commandés (mise de côté, plus disponible à la vente)
2. **Notifier le responsable stock** par email + créer une tâche dans un nouveau dashboard
3. Le responsable stock peut **assigner** la commande à un préparateur, qui reçoit une notif
4. Le préparateur marque la commande comme "préparée" → débloque l'étape Expédition

### Diagnostic actuel

- La table `stock_levels` a déjà une colonne `reserved` (jamais utilisée)
- La validation paiement (`handleQuickValidate('payment')` + `handleBulkValidatePayment`) met juste `payment_status = 'Paid'` et `validation_flags.payment = true`
- Aucune réservation de stock n'a lieu, aucune notification n'est envoyée à un responsable stock
- Pas de rôle `stock_manager` ni `preparator` dans `app_role` (actuellement seulement `admin`)

### Architecture proposée

#### 1. Base de données (migration SQL)

**Nouveaux rôles** dans l'enum `app_role` :
- `stock_manager` — voit les commandes à préparer, assigne les préparations
- `preparator` — voit ses commandes assignées, les marque préparées

**Nouvelle table `order_preparations`** :
```
id, order_id, status (pending|assigned|in_progress|ready|cancelled),
assigned_to (uuid → auth.users), assigned_by, assigned_at,
prepared_at, notes, created_at, updated_at
```

**Nouvelle colonne `orders.stock_reserved_at`** (timestamp) pour tracer la réservation.

**Nouvelle RPC `reserve_order_stock(p_order_id uuid)`** (SECURITY DEFINER) :
- Lit `orders.items` (jsonb)
- Pour chaque item, trouve la ligne `stock_levels` matchant (via `inventory.product_id` + size si présente, location de type `web`)
- Incrémente `reserved` du `quantity` commandé
- Insère une ligne dans `stock_history` avec action `reservation`
- Met `orders.stock_reserved_at = now()`
- Idempotent : si `stock_reserved_at` est déjà défini, ne rien faire

**Nouvelle RPC `release_order_stock(p_order_id uuid)`** : inverse (annulation/suppression commande).

**Nouvelle RPC `consume_order_stock(p_order_id uuid)`** : appelée à l'expédition — décrémente `quantity` et `reserved` ensemble (le produit quitte vraiment le stock).

**RLS** : `order_preparations` lisible par `admin`, `stock_manager`, et par le `preparator` à qui c'est assigné. Modifiable par `admin`/`stock_manager` ; `preparator` peut juste passer son préparation à `ready`.

#### 2. Backend — Edge Function

Étendre `send-order-notification` pour gérer 2 nouveaux types :
- `stock_reservation_created` → envoyé à tous les utilisateurs ayant le rôle `stock_manager` (email récupéré via `customers.email` ou `auth.users`) — sujet « Nouvelle commande à préparer #ORDER »
- `preparation_assigned` → envoyé au préparateur assigné

Templates ajoutés dans `notification_config.email_templates` (avec valeurs par défaut FR).

#### 3. Frontend

**`src/pages/admin/AdminOrders.tsx`** :
- Dans `handleQuickValidate` (cas `payment`) ET `handleBulkValidatePayment` : après succès → appeler `supabase.rpc('reserve_order_stock', { p_order_id })`, puis `supabase.functions.invoke('send-order-notification', { ..., notificationType: 'stock_reservation_created' })`
- Toast : « Stock réservé, responsable stock notifié »

**Nouvelle page `src/pages/admin/AdminPreparations.tsx`** (route `/admin/preparations`) :
- Liste des préparations en attente (filtrable par statut)
- Affiche : n° commande, client, articles à préparer (size/color/qty), bouton « Assigner à... » (select des users `preparator`)
- Pour `preparator` connecté : ne voit que ses préparations, bouton « Marquer prêt » → met `status='ready'`, débloque automatiquement `validation_flags.shipping`-ready-state (ne valide pas l'expédition mais affiche un badge « Préparée » dans AdminOrders pour autoriser le clic d'expédition)

**Nouvelle entrée sidebar admin** : « Préparations » (visible si `admin` ou `stock_manager`).

**`src/pages/admin/AdminOrders.tsx`** : ajouter un badge « 📦 Stock réservé » et « ✅ Préparée » dans la colonne validation.

**`AdminStock.tsx`** : afficher la colonne `reserved` (déjà en DB) à côté de `quantity` pour visualiser le stock mis de côté.

#### 4. Gestion des rôles

Dans `AdminCustomers` (ou nouvelle section dans `AdminSettings` → « Équipe ») :
- Permettre à un `admin` d'attribuer les rôles `stock_manager` / `preparator` à des comptes existants

### Diagramme de flux

```text
Validation Paiement (admin click)
         │
         ▼
  RPC reserve_order_stock
  ├─ stock_levels.reserved += qty
  ├─ stock_history insert
  └─ orders.stock_reserved_at = now()
         │
         ▼
  Edge fn → email stock_manager(s)
  + insert order_preparations(status='pending')
         │
         ▼
  Stock manager ouvre /admin/preparations
  Assigne à un préparateur ──► email préparateur
         │
         ▼
  Préparateur marque "prêt"
  order_preparations.status='ready'
         │
         ▼
  Admin valide expédition (étape 3 existante)
  └─ RPC consume_order_stock (quantity -= qty, reserved -= qty)
```

### Fichiers modifiés / créés

| Fichier | Type | Changement |
|---|---|---|
| Migration SQL | nouveau | enum roles + table `order_preparations` + 3 RPC + colonne `stock_reserved_at` + RLS |
| `supabase/functions/send-order-notification/index.ts` | edit | gestion des types `stock_reservation_created` et `preparation_assigned` (lookup destinataires par rôle) |
| `src/pages/admin/AdminOrders.tsx` | edit | appel RPC + notif après validation paiement, badges stock/préparation |
| `src/pages/admin/AdminPreparations.tsx` | nouveau | dashboard préparations + assignation |
| `src/pages/admin/AdminStock.tsx` | edit | colonne `reserved` affichée |
| `src/pages/admin/Admin.tsx` (sidebar) | edit | nouvelle entrée « Préparations » |
| `src/App.tsx` | edit | route `/admin/preparations` |
| Composant gestion rôles équipe | nouveau ou edit AdminSettings | UI attribution `stock_manager` / `preparator` |

### Questions avant implémentation

1. Veux-tu **2 nouveaux rôles distincts** (`stock_manager` qui assigne + `preparator` qui prépare), ou **un seul rôle** `stock_manager` qui fait tout (réception alerte + préparation) ?
2. La **réservation doit-elle bloquer la vente** (afficher stock affichable = `quantity - reserved` côté boutique) ou juste informer en interne ?
3. L'email destinataire du responsable stock : utiliser **tous les comptes ayant le rôle**, ou un seul **email fixe** configuré dans `admin_config.admin_notification_email` ?
