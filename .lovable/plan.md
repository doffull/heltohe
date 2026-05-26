## Diagnostic

Le problème n'est PAS lié au Publish ou à la synchro de données. La base Live contient bien votre logo, hero, couleurs (vous l'avez confirmé : tout est visible dans `/admin` live).

Le vrai problème est dans les **politiques RLS** de la table `design_settings`, modifiées lors du dernier correctif sécurité :

- Le frontend public lit ces données via la vue `design_settings_public` (avec `security_invoker=on`), ce qui exécute les politiques RLS de la table de base **sous le rôle de l'utilisateur** (donc `anon` pour un visiteur).
- Après le correctif, il ne reste sur `design_settings` que :
  - une politique permissive réservée aux `admin`
  - une politique restrictive imposant `admin` aux `authenticated`
- **Aucune politique ne donne accès en lecture à `anon`** → le visiteur public ne reçoit aucune ligne → pas de logo, pas de hero, pas de couleurs, pas de favicon, etc.

C'est exactement le symptôme que vous décrivez sur `lvtk2026.lovable.app`, alors que le preview (où vous êtes connecté en admin) fonctionne.

## Correctif

Migration SQL qui ajoute une politique permissive `SELECT` pour `anon` et `authenticated` sur `design_settings`, **uniquement** pour les colonnes exposées par la vue publique (l'accès direct à la table reste impossible en pratique car le code applicatif lit toujours `design_settings_public`, et les colonnes sensibles ne sont pas dans la vue).

```sql
CREATE POLICY "Public can read design settings via view"
ON public.design_settings
FOR SELECT
TO anon, authenticated
USING (true);
```

La politique restrictive existante continue de protéger les autres opérations (INSERT/UPDATE/DELETE réservés admin) et la vue publique ne contient déjà aucun champ sensible (pas de clés API, pas de config admin — celles-ci vivent dans `admin_config`).

## Vérification après application

1. Ouvrir `https://lvtk2026.lovable.app` en navigation privée → logo, hero, couleurs réapparaissent
2. Re-vérifier le scan sécurité → la table `design_settings` reste exposée uniquement via la vue, sans champs sensibles
3. Mettre à jour `mem://security/order-and-ai-safety` pour noter que la lecture publique de `design_settings` est **intentionnelle** via la vue `design_settings_public`

## À noter

- **Aucun re-Publish n'est nécessaire** après la migration : les migrations s'appliquent immédiatement sur Live.
- Aucun changement de code frontend requis.
