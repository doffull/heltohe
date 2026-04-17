

## Plan : Corriger l'accès public aux paramètres de design (logo, hero, etc.)

### Diagnostic confirmé

J'ai testé l'API publique de votre site avec la clé anonyme (la même que celle utilisée par le site publié) :

| Endpoint | Résultat anonyme |
|---|---|
| `categories` | ✅ Données reçues |
| `products` | ✅ Données reçues |
| **`design_settings_public`** | ❌ **`[]` (vide)** |
| `design_settings` | ❌ `[]` (RLS admin-only) |

**Cause racine :** la vue `design_settings_public` (utilisée par `useDesignSettings` pour charger le logo, le nom du site, les slides du hero, le HUD, les couleurs, les sections home, etc.) **n'accorde pas le SELECT aux rôles `anon` et `authenticated`**. Seul le rôle interne `sandbox_exec` y a accès. La table sous-jacente `design_settings` a une RLS "admin only".

Conséquence : sur le site publié (où l'utilisateur n'est pas connecté en admin), `useDesignSettings` reçoit `null`, donc l'app retombe sur `INITIAL_DESIGN_SETTINGS` (placeholders) → pas de logo, pas de hero, mauvais nom de site.

Sur la preview, vous êtes connecté en admin → vous voyez les vraies données. D'où l'écart.

### Correction

**Migration SQL :**

1. Recréer la vue `design_settings_public` avec `WITH (security_invoker = off)` pour qu'elle s'exécute avec les droits de son owner (postgres) et contourne la RLS admin-only de la table de base.
2. `GRANT SELECT ON public.design_settings_public TO anon, authenticated;`
3. La vue continue d'exposer **uniquement** les colonnes non sensibles (déjà le cas — pas d'emails admin, pas de secrets). Les colonnes sensibles restent uniquement accessibles via la table `design_settings` (admin-only).

### Audit complémentaire

Pendant que j'y suis, je vérifie également l'accès anonyme aux autres données utilisées par la home publiée :
- `banners` ✅ (RLS "Anyone can view active banners")
- `pages` ✅ (RLS "Anyone can view published pages")
- `bot_config` ✅ (RLS "Anyone can view bot config")
- `categories` ✅ déjà testé OK
- `products` ✅ déjà testé OK
- `locations`, `loyalty_rewards`, `product_looks`, `product_styles` ✅ tous "Anyone can view active"
- Fichiers du bucket `media` ✅ (bucket public, URLs testées et accessibles)

Donc la **seule correction nécessaire** est l'accès à la vue `design_settings_public`.

### Résultat attendu après correction

Une fois la migration appliquée et le site re-publié (clic sur "Update" dans la dialog Publish — les changements **frontend** ne sont pas nécessaires puisqu'on ne touche qu'à la base, mais le site servira directement la nouvelle vue dès la prochaine requête car il n'y a aucun cache CDN sur les appels Supabase) :

- Le logo s'affichera
- Le nom du site (HELVETICA 2026) s'affichera dans l'onglet et le HUD
- Les 2 slides du hero apparaîtront
- Le HUD, les couleurs, les sections home, le sidebar, etc. seront identiques à la preview

### Fichier modifié

| Fichier | Changement |
|---|---|
| Nouvelle migration SQL | Recréer `design_settings_public` avec `security_invoker=off` + GRANT SELECT à `anon` et `authenticated` |

Aucun changement de code frontend — c'est une correction purement base de données.

