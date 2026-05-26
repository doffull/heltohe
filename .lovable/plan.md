## Objectif

Ajouter un nouveau rôle « Valideur de commandes » et restreindre la vue du rôle « Auditeur » dans le tableau de bord admin.

## 1. Nouveau rôle : `order_validator`

### Base de données (migration)
- Ajouter la valeur `'order_validator'` à l'enum `app_role`.
- Les politiques RLS existantes basées sur `admin` continuent de fonctionner ; aucune table n'a besoin de nouvelles policies pour le moment (le rôle sert d'abord à filtrer le menu admin côté client).

### Code
- `src/context/AuthContext.tsx` : ajouter `'order_validator'` au type `AppRole`, exposer `isOrderValidator` et l'inclure dans `hasAdminPanelAccess`.
- `src/hooks/useUserRoles.ts` : ajouter `order_validator` dans `AppRole`, `ROLE_LABELS` (« Valideur commandes ») et `ROLE_COLORS`.
- `src/pages/admin/AdminRoles.tsx` : ajouter l'option `<option value="order_validator">` dans le select d'attribution de rôle.
- `src/pages/admin/Admin.tsx` :
  - Importer `isOrderValidator` depuis `useAuth`.
  - Ajouter constante `ORDER_VALIDATOR_ROUTES = new Set([` `/admin`, `/admin/produits`, `/admin/commandes`, `/admin/preparations`, `/admin/checkout`, `/admin/clients`, `/admin/stock`, `/admin/colissimo`, `/admin/chatbot` `])`.
  - L'ajouter dans le calcul de `allowedHrefs`.

## 2. Restriction du rôle Auditeur

Modifier `AUDITOR_ROUTES` dans `src/pages/admin/Admin.tsx` pour **exclure** : Design, Paramètres, Icônes Accueil, Roulette, Marketing, Pages, Transitions.

Nouvelle liste autorisée pour l'auditeur :
`/admin`, `/admin/live`, `/admin/produits`, `/admin/commandes`, `/admin/preparations`, `/admin/checkout`, `/admin/clients`, `/admin/media`, `/admin/stock`, `/admin/colissimo`, `/admin/notifications`, `/admin/chatbot`, `/admin/woocommerce`, `/admin/audit`, `/admin/errors`, `/admin/security`, `/admin/bannieres-analytics`, `/admin/roles`.

(L'auditeur garde un accès lecture seule : aucune policy RLS n'est modifiée, seule la navigation est filtrée.)

## Détails techniques

- Migration SQL :
  ```sql
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'order_validator';
  ```
- Aucun changement aux tables existantes, aux composants produit/commande, ni à la logique métier.
- Le filtrage menu est déjà géré par `allowedHrefs.filter(...)` dans le `SidebarContent`, et la redirection automatique si la route active n'est pas autorisée fonctionne déjà.

## Fichiers modifiés
- `supabase/migrations/<timestamp>.sql` (nouveau)
- `src/context/AuthContext.tsx`
- `src/hooks/useUserRoles.ts`
- `src/pages/admin/AdminRoles.tsx`
- `src/pages/admin/Admin.tsx`