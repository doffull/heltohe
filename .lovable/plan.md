## Objectif

Créer une page admin interne `/admin/roles` permettant d'assigner (ou retirer) le rôle `admin` à un utilisateur via son email, avec une étape de confirmation, pour éviter de devoir passer par le code/SQL.

## Périmètre

- Accès réservé aux utilisateurs ayant déjà le rôle `admin` (RLS + garde côté route).
- Recherche d'un compte existant par email (insensible à la casse).
- Affichage des rôles actuels (admin / stock_manager / preparator).
- Boutons « Promouvoir admin » et « Retirer admin » avec un dialogue de confirmation explicite (récap email + action).
- Journal des dernières actions via `role_audit_log` (déjà en place).

## Fonctionnement

1. L'admin ouvre `Admin → Rôles` (nouvelle entrée sidebar avec icône `ShieldCheck`).
2. Il saisit un email → la page appelle une fonction SQL `find_user_by_email(email)` (SECURITY DEFINER, admin-only) qui retourne `user_id`, `email`, et la liste des rôles.
   - Nécessaire car `auth.users` n'est pas accessible côté client.
3. Si trouvé : la page affiche la fiche (email, id, rôles actuels) + boutons d'action.
4. Au clic sur « Promouvoir admin » ou « Retirer admin » : `AlertDialog` de confirmation → insert/delete dans `public.user_roles` (déjà protégé par RLS admin-only et tracé par le trigger `audit_role_change`).
5. Toast de succès, rafraîchissement automatique de la fiche + invalidation `useAllUserRoles`.
6. Section « Activité récente » affichant les 20 derniers événements de `role_audit_log` (déjà branché via `useRoleAuditLog`).

## Sécurité

- Nouvelle fonction Postgres `find_user_by_email(p_email text)` SECURITY DEFINER : retourne au plus 1 ligne `(user_id, email, roles)`. Lève `FORBIDDEN` si l'appelant n'est pas admin.
- Aucune écriture directe sur `auth.users`.
- Toutes les modifications passent par la table `user_roles` dont les policies n'autorisent l'insert/delete qu'aux admins.
- Toute action est journalisée par le trigger `audit_role_change` existant.
- Garde-fous UI :
  - Empêcher un admin de se retirer son propre rôle (vérif `auth.uid()`).
  - Confirmation obligatoire avec l'email retapé ou cochage explicite « Je confirme ».

## Détails techniques

- **Migration SQL** : créer `public.find_user_by_email(p_email text) RETURNS TABLE(user_id uuid, email text, roles app_role[])`.
- **Nouvelle page** : `src/pages/admin/AdminRoles.tsx`.
- **Sidebar** : ajouter `{ icon: ShieldCheck, label: 'Rôles', href: '/admin/roles' }` dans `src/pages/admin/Admin.tsx` + route + couleur par défaut.
- **Hook** : petit hook local utilisant `supabase.rpc('find_user_by_email', { p_email })`.
- **UI** : Card de recherche, Card résultat avec badges de rôles (réutiliser `ROLE_LABELS` / `ROLE_COLORS` de `useUserRoles.ts`), AlertDialog de confirmation, tableau d'audit.

## Hors périmètre

- Création de compte (l'utilisateur doit déjà s'être inscrit via `/auth`).
- Gestion des rôles `stock_manager` / `preparator` (pourra être ajoutée plus tard sur la même page si besoin).
