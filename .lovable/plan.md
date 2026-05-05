## Plan : Sécurisation maximale du site

### Audit réalisé

J'ai exécuté le scan de sécurité Supabase + le linter. **11 findings** au total. Voici la liste des problèmes réels et des corrections proposées.

### Problèmes détectés

| # | Sévérité | Problème |
|---|---|---|
| 1 | 🔴 ERROR | Vue `design_settings_public` créée avec `security_invoker = off` (équivalent SECURITY DEFINER) — contourne la RLS du rôle appelant |
| 2 | 🟠 WARN | Données sensibles exposées dans la vue `design_settings_public` : `contact_email`, `legal_siret`, `legal_vat`, `legal_director`, `legal_rgpd_email`, `legal_return_email` — accessibles à tout visiteur anonyme |
| 3 | 🟠 WARN | Bucket storage `media` est public ET autorise le LISTING — n'importe qui peut lister tous les fichiers stockés |
| 4 | 🟠 WARN | 8× fonctions `SECURITY DEFINER` avec `EXECUTE` accordé à `anon` / `authenticated` (`has_role`, `validate_and_create_order`, `auto_create_category_page`, `generate_category_slug`, `audit_role_change`, `auto_create_inventory_on_product_insert`, `update_updated_at_column`) — seules `has_role` et `validate_and_create_order` doivent rester appelables ; les autres sont des triggers et ne devraient pas être exposées via l'API REST |
| 5 | 🟡 INFO | Auth : leaked-password protection (HIBP) déjà activée ✅ |
| 6 | 🟡 INFO | Email auto-confirm désactivé (vérification email obligatoire) ✅ |

### Corrections (1 migration SQL)

**A. Vue `design_settings_public` — retirer les colonnes sensibles**

Recréer la vue en EXCLUANT :
- `contact_email`, `contact_phone`
- `legal_siret`, `legal_vat`, `legal_director`, `legal_rgpd_email`, `legal_return_email`, `legal_rcs`, `legal_capital`
- `admin_notification_email` (déjà absent ✅)

Garder seulement les champs réellement utilisés par le frontend public (logo, hero, couleurs, sections home, sidebar, header, etc.). Les champs légaux et de contact resteront accessibles uniquement aux admins via la table `design_settings` directement.

→ Met à jour les pages légales (CGV, Mentions légales, Confidentialité, Contact) pour qu'elles lisent ces données via une nouvelle RPC `get_legal_info()` SECURITY DEFINER qui retourne ces champs (nécessaire car le site public en a besoin pour les pages légales — mais on les expose de manière contrôlée).

**B. Bucket `media` — bloquer le listing**

Garder le bucket public (les URLs des images doivent rester accessibles), mais supprimer la policy SELECT large sur `storage.objects` qui permet `LIST`. Les images restent accessibles par URL directe (lecture par chemin connu) mais on ne peut plus énumérer le contenu du bucket.

**C. Fonctions SECURITY DEFINER — révoquer EXECUTE inutiles**

```sql
-- Triggers (jamais appelés via API)
REVOKE EXECUTE ON FUNCTION public.auto_create_category_page() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_category_slug() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.audit_role_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_create_inventory_on_product_insert() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- Garder accessibles : has_role (utilisé par RLS) et validate_and_create_order (RPC checkout)
```

**D. Hardening complémentaire**

- Ajouter une policy explicite `Deny anon` sur les tables sensibles (`admin_config`, `notification_config`, `notification_log`, `role_audit_log`, `colissimo_bordereaux`, `stock_transfers`, `stock_history`) — déjà couvertes par "admin only" mais ajout explicite pour défense en profondeur.
- Vérifier que la table `messages` valide la taille du message (ajouter check ≤ 5000 chars) pour éviter spam.

### Résumé des changements

| Fichier | Type | Changement |
|---|---|---|
| Nouvelle migration SQL | DB | Recréer vue, révoquer EXECUTE, créer RPC `get_legal_info()`, durcir storage, ajouter checks |
| `src/hooks/useLegalInfo.ts` | Code | Utiliser la nouvelle RPC `get_legal_info()` au lieu de lire la vue |

### Ce qui reste sécurisé (déjà en place ✅)

- RLS activée sur toutes les tables
- Rôles dans table séparée `user_roles` + fonction `has_role`
- Mot de passe : min 6 chars + HIBP activé
- Email confirmation obligatoire
- Honeypot + délai 10s sur formulaires anonymes
- Validation Zod côté client
- RPC `validate_and_create_order` revalide prix côté serveur
- Audit log sur changements de rôles

### Note

Aucune donnée existante n'est perdue. Le site continue de fonctionner identiquement pour les visiteurs ; seules les données sensibles cessent d'être exposées publiquement.
