# Diagnostiquer les synchros WooCommerce

## Objectif
Ajouter une page admin pour consulter/filtrer les entrées de `wp_sync_logs` (déjà créée en base mais vide aujourd'hui), et faire en sorte que la synchro WooCommerce y écrive automatiquement à chaque exécution. Permettre aussi un test de synchro depuis cette page.

## 1. Edge function `woocommerce-import` — écrire dans `wp_sync_logs`
Mettre à jour `supabase/functions/woocommerce-import/index.ts` :
- Créer le client Supabase avec la `service_role` (déjà dispo dans l'env).
- En fin d'exécution (succès, partiel ou erreur), insérer une ligne :
  - `direction`: `'import'`
  - `status`: `'success'` | `'partial'` (si `errors.length > 0` mais des données importées) | `'failed'`
  - `total`, `succeeded`, `failed`: agrégats produits + commandes + clients
  - `message`: résumé court ou message d'erreur principal
  - `details` (jsonb): `{ products, orders, customers, errors, storeUrl, durationMs }`
  - `triggered_by`: `auth.uid()` extrait du JWT entrant
- Logger même quand le serveur WooCommerce est injoignable (`fallback`).

## 2. Nouvelle page admin `AdminWooCommerceLogs`
Fichier `src/pages/admin/AdminWooCommerceLogs.tsx` :
- Table des logs (date, direction, statut, total/succeeded/failed, message, bouton "Détails").
- Filtres : direction (import/export/tous), statut (success/partial/failed/tous), recherche texte dans `message`, plage de dates.
- Tri par `created_at` desc, pagination par 50.
- Panneau latéral "Détails" : JSON formaté de `details` + stack/erreurs déroulées.
- Bouton "Rafraîchir" + "Vider les logs > 30 jours" (admin only).
- Badge couleur par statut (vert/orange/rouge) cohérent avec le thème industrial luxury existant.

## 3. Intégration dans la navigation admin
Dans `src/pages/admin/AdminWooCommerce.tsx` :
- Transformer en layout à onglets (Tabs shadcn) : `Synchronisation` (UI existante) / `Logs de sync`.
- Sous-route `/admin/woocommerce/logs` qui rend `AdminWooCommerceLogs`.
- Lien rapide "Voir le dernier log" affiché après un import.

## 4. Tester la connexion + sync depuis la page logs
Réutiliser l'UI existante de `AdminWooCommerce` (test connexion + lancer import). Après chaque import:
- Toast avec lien "Voir le log" qui ouvre le détail correspondant.
- Rechargement auto du tableau de logs si on est sur l'onglet logs.

## Détails techniques
- Pas de migration DB nécessaire (la table existe déjà avec RLS admin-only).
- Types : utiliser `(supabase as any).from('wp_sync_logs')` comme pour `client_error_logs` (la table n'est pas encore typée dans `types.ts` — régénération auto au prochain déploiement).
- Composants shadcn : `Tabs`, `Table`, `Badge`, `Input`, `Select`, `Button`, `Dialog` pour les détails.
- Aucun changement front impactant le storefront public.

## Hors scope
- Logs d'export WooCommerce (pas encore d'export implémenté — la page est prête à les afficher quand ils existeront).
- Synchro bidirectionnelle automatique (à planifier ensuite).
