# Fix: "Erreur de sauvegarde" sur Hero Techwear

## Cause racine

Les logs Postgres montrent l'erreur exacte au moment de la sauvegarde :

```
ERROR: permission denied for table design_settings
```

La politique RLS « Admins can manage design settings » est bien présente et correcte, **mais** la table `public.design_settings` n'a aucun GRANT pour le rôle `authenticated` (vérifié via `information_schema.role_table_grants` → 0 ligne).

En Postgres, RLS s'évalue *après* les permissions de table. Sans `GRANT INSERT/UPDATE/DELETE`, même un admin se voit refuser l'écriture, ce qui produit l'erreur "Erreur de sauvegarde" lorsqu'on active le Hero Techwear et qu'on enregistre.

La lecture publique fonctionne car elle passe par la vue `design_settings_public` (qui a, elle, ses propres GRANTs).

## Correctif

Migration SQL unique :

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_settings TO authenticated;
```

(Les RLS continuent à restreindre l'accès aux seuls utilisateurs ayant le rôle `admin` — la sécurité reste identique.)

## Vérification

1. Recharger `/admin/design` → onglet Hero Techwear.
2. Activer le switch, modifier un champ, cliquer Enregistrer → toast de succès attendu.
3. Re-vérifier les logs Postgres : plus d'erreur `permission denied`.
4. Sur la page d'accueil, le Hero Techwear remplace bien le Hero Slider.

Aucune modification de code front nécessaire — la cause est purement DB.