
# Ajout du rôle Super Admin pour 6000art@gmail.com

## Ce qui sera fait

Une migration SQL sera créée pour insérer ton rôle admin dans la table `user_roles`. Ton compte a été trouvé avec l'ID `956f6ec9-44ce-42fd-afbc-0127a5c2a462`.

## Migration SQL

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('956f6ec9-44ce-42fd-afbc-0127a5c2a462', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Activation de la verification admin

Actuellement dans `src/pages/admin/Admin.tsx`, la verification admin est commentee pour le developpement. Elle sera reactivee pour securiser l'acces au panneau admin :

```typescript
// Avant (commenté)
// if (!isAdmin) {
//   return <Navigate to="/" replace />;
// }

// Après (actif)
if (!isAdmin) {
  return <Navigate to="/" replace />;
}
```

## Resultat

- Tu auras le role `admin` en base de donnees
- Le panneau admin (`/admin`) sera protege : seuls les utilisateurs avec le role admin pourront y acceder
- Tu pourras te deconnecter et te reconnecter pour que le role soit pris en compte

## Details techniques

**Fichiers modifies :**
- `supabase/migrations/` -- nouvelle migration pour inserer le role admin
- `src/pages/admin/Admin.tsx` -- reactivation du guard admin
