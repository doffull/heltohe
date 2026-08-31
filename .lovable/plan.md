# Sync WordPress/WooCommerce : clients, commandes et statistiques

Objectif : récupérer de façon fiable les clients, les commandes (y compris celles en cours) et les statistiques de la boutique WooCommerce, sans toucher aux produits.

## Ce qui bloque aujourd'hui (vérifié)

1. **Les clients ne peuvent pas être enregistrés.** L'import fait un `upsert` sur `customers` avec conflit sur `email`, mais la table `customers` n'a aucune contrainte d'unicité sur `email` : chaque client remonté part en erreur. La table exige aussi un `user_id` non nul, actuellement rempli par un faux identifiant fabriqué à la main.
2. **Les identifiants ne sont jamais sauvegardés.** L'URL de la boutique, la Consumer Key et le Consumer Secret sont à retaper à chaque visite de la page Admin → WooCommerce, donc aucune synchronisation programmée n'est possible.
3. **Le bouton « Tester la connexion » appelle WooCommerce depuis le navigateur**, ce qui échoue quasi systématiquement (CORS / pare-feu), alors que la fonction serveur dispose déjà d'un mode `ping` fiable.
4. **Aucune statistique n'est récupérée** : les endpoints de rapports WooCommerce ne sont pas appelés.
5. Les commandes importées ne conservent pas leur identifiant WooCommerce ni leur date d'origine, ce qui empêche une synchronisation incrémentale (« seulement ce qui a changé »).

## Ce que je vais faire

### 1. Base de données
- Ajouter une contrainte d'unicité sur `customers.email` (après fusion des éventuels doublons) et rendre `user_id` optionnel pour les clients importés.
- Ajouter les colonnes de traçabilité : `wc_id` + `source` sur `customers` et `orders`, et conserver la date de création WooCommerce.
- Nouvelle table `woocommerce_config` (URL, clé, secret, options de sync, date de dernière sync) réservée aux admins, avec les droits d'accès nécessaires.
- Nouvelle table `woocommerce_stats` pour stocker les statistiques rapatriées (ventes par jour, totaux commandes/clients, top ventes).

### 2. Fonction de synchronisation
- Sauvegarde et relecture des identifiants depuis la base : plus rien à retaper.
- **Clients** : import complet (nom, e-mail, téléphone, adresses de facturation et livraison, total dépensé, nombre de commandes), mise à jour sans doublon.
- **Commandes** : import de tous les statuts, y compris **en cours** (pending, processing, on-hold), avec articles, frais de port, TVA, remises, moyen de paiement, notes client, numéro de suivi et remboursements. Correspondance de statut WooCommerce → statut du site.
- **Synchronisation incrémentale** : option « depuis la dernière synchro » (filtre `modified_after`) pour ne récupérer que les nouveautés, plus rapide et sans surcharge du serveur WordPress.
- **Statistiques** : rapports ventes, totaux commandes, totaux clients, coupons utilisés, meilleures ventes, sur périodes (jour / semaine / mois / année).
- **Produits exclus** : les produits et les stocks ne sont plus synchronisés (les cases correspondantes disparaissent de l'écran).
- Journalisation détaillée par section dans les logs de sync existants, avec le décompte réel et le premier message d'erreur lisible.

### 3. Interface Admin → WooCommerce
- Formulaire de connexion avec **Enregistrer** et un test de connexion qui passe par le serveur (fiable), affichant le nom de la boutique et la version WooCommerce en cas de succès.
- Cases à cocher : Clients / Commandes / Statistiques (plus de Produits ni de Stocks).
- Bouton « Synchroniser maintenant » + bouton « Sync incrémentale ».
- Panneau de résultats : nombre de clients et de commandes importés, commandes en cours détectées, erreurs éventuelles avec lien vers le log.
- Onglet **Statistiques** : chiffre d'affaires, panier moyen, nombre de commandes par statut, top produits vendus, évolution sur la période choisie — alimenté par les données rapatriées.
- Date et heure de la dernière synchronisation affichées.

## Détails techniques
- Migration SQL : dédoublonnage puis `UNIQUE (email)` sur `customers`, `user_id` nullable, colonnes `wc_id`/`source`/`wc_created_at`, tables `woocommerce_config` et `woocommerce_stats` avec RLS admin uniquement et GRANT `authenticated`/`service_role`.
- `supabase/functions/woocommerce-import/index.ts` : nouveaux modes `save-config`, `ping`, `sync` (clients/commandes/stats), `stats`. Endpoints utilisés : `/customers`, `/orders?status=any`, `/orders/{id}/notes`, `/refunds`, `/reports/sales`, `/reports/orders/totals`, `/reports/customers/totals`, `/reports/top_sellers`. Le mécanisme actuel de retry + rotation d'auth/UA est conservé.
- Nouveau hook `src/hooks/useWooCommerce.ts` (config, sync, stats via React Query) et refonte de `src/pages/admin/AdminWooCommerce.tsx` avec l'onglet Statistiques ; l'onglet Logs existant est conservé.
- Le secret WooCommerce reste côté serveur : il n'est jamais renvoyé au navigateur (champ masqué, seul un indicateur « défini » est exposé).
