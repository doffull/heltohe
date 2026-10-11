# Refonte Analytics, Live et Paniers abandonnés (sans risque pour la production)

## Garde-fous (pour toutes les étapes)
- Travail uniquement dans un **brouillon isolé** (draft Lovable), jamais sur le projet principal tant que ce n'est pas validé.
- Pages en **lecture seule** : aucune migration, aucune écriture dans les commandes, stocks, paiements, CMS ou clients ; aucune publication.
- Relance de panier : le bouton ouvre un **aperçu** ; l'envoi réel reste désactivé tant que le consentement n'est pas prouvé et que vous n'avez pas validé l'intégration.

## Constats de l'audit (vérifiés)
1. **Simulations** dans `src/hooks/useAnalyticsData.ts` : `MOCK_PRODUCTS`, `makeMockOrder`, `buildMockHistory` (400 jours aléatoires), simulation de ventes en direct. Elles sont inactives (`demoMode = false`) mais toujours chargées : `buildMockHistory()` tourne à chaque montage. À supprimer.
2. **Fausse conversion** dans `AdminAnalytics.tsx` lignes 129-131 et 368-369 : `sessions = count * 34 + 40`, affiché « sessions estimées ». C'est inventé. À remplacer par les vraies sessions de `visitor_sessions`, ou à masquer.
3. **Limite de 5000 commandes** : `.limit(5000)`, sans pagination ni filtre de dates côté serveur. La base plafonne aussi probablement le nombre de lignes renvoyées par requête : le plafond réel reste à mesurer (étape 1).
4. **Remises** : calculées comme `subtotal + shipping - total`. Le code promo est tiré des notes par une expression régulière : c'est fragile.
5. **Champs réels disponibles** dans `orders` : `subtotal`, `tax`, `shipping_cost`, `total`, `payment_status`, `status`, `is_test`, `is_draft`, `abandoned_at`, `source`, `wc_id`, `wc_created_at`. Les taxes existent (aujourd'hui à 0 €). Il n'y a pas de colonne pour les remboursements ni pour les frais de paiement : ils seront marqués « non disponible » et non inventés.
6. **Historique WooCommerce** : les commandes importées sont dans `orders`, repérables par `source` / `wc_id`, avec leur vraie date dans `wc_created_at`. Les totaux agrégés sont dans `woocommerce_stats`. Aujourd'hui, le tableau de bord n'utilise que `created_at`, donc les dates historiques sont faussées.
7. **Commandes de test** : `is_test` n'est pas filtré aujourd'hui. À exclure.
8. **Live** (`AdminLive.tsx`) : il lit `visitor_sessions` (100 lignes), `page_views` et `click_events` (200 lignes). `page_views.duration_ms` existe, donc les parcours et les durées sont calculables. Aucun événement « ajout au panier » ni « début de paiement » n'est enregistré : l'entonnoir de conversion ne sera pas affiché. Seul le lien réel session → commande (via `user_id`) sera montré.
9. **Paniers** : deux sources réelles.
   - Les commandes non payées (`is_draft`, `abandoned_at`, `payment_status` différent de Paid), déjà exposées par `useOrders('abandoned')`. Elles contiennent un e-mail.
   - `cart_items` : paniers des clients connectés uniquement, sans e-mail direct.
   - Aucune table ne stocke de consentement à la relance de panier. La preuve d'opt-in ne pourra venir que des abonnés newsletter confirmés (double opt-in), à vérifier à l'étape 1.

## Étapes de réalisation

**Étape 1 — Vérifications en lecture seule (aucune écriture)**
- Mesurer le plafond de lignes, le volume de commandes payées, la répartition WooCommerce/site et le nombre de commandes de test.
- Contrôler les droits d'accès admin (règles RLS) sur `visitor_sessions`, `page_views`, `cart_items` et la table des abonnés newsletter.

**Étape 2 — Couche de données propre**
- Nouveau `src/lib/analytics/metrics.ts`, avec des fonctions pures et testées :
  - ventes brutes, remises, ventes nettes, livraison, taxes, total payé ;
  - date effective = `wc_created_at` si présente, sinon `created_at` ;
  - exclusion de `is_test` et de `is_draft`.
- Nouveau `src/lib/analytics/compare.ts` : période précédente de même durée, et N-1.
- Nouveau `src/lib/analytics/buckets.ts` : regroupement par minute, heure ou jour, choisi automatiquement selon la période.
- Réécriture de `src/hooks/useAnalyticsData.ts` :
  - requête filtrée par dates côté serveur et paginée par `.range()` (lots de 1000) ;
  - plus aucune simulation ;
  - `useRealSessions(range)`, un comptage simple sur `visitor_sessions`.

**Étape 3 — Nouveau `/admin/analytics` (style Shopify, fond blanc)**
- Fichier `src/pages/admin/AdminAnalytics.tsx` réécrit, découpé en `src/components/admin/analytics/` :
  - `KpiStrip.tsx` : ventes payées, commandes, panier moyen, avec les écarts vs période précédente et vs N-1 ;
  - `SalesChart.tsx` : courbe de la période en cours et de la comparaison en pointillés ;
  - `SalesBreakdown.tsx` : brut / remises / net / livraison / taxes, les champs absents marqués « non disponible » ;
  - `TopProducts.tsx` ;
  - `OrdersTable.tsx` : tri, recherche, export CSV ;
  - `PeriodPicker.tsx`.
- Accents de couleur cyan/bleu, orange, vert et violet ajoutés comme couleurs du thème dans `src/index.css` et `tailwind.config.ts`. Ces couleurs sont limitées à cette page.
- Version mobile à 360 px : KPI en défilement horizontal, tableau qui défile.
- Taux de conversion affiché seulement si des sessions réelles existent, avec la mention « sessions enregistrées ».

**Étape 4 — `/admin/live` : parcours et durées**
- `AdminLive.tsx` avec deux ajouts dans `src/components/admin/live/` :
  - `SessionJourney.tsx` : pages vues dans l'ordre, durée par page, durée totale ;
  - `JourneyStats.tsx` : durée moyenne, pages par session, pages d'entrée et de sortie.
- Lien vers une commande seulement si `user_id` correspond. Pas d'entonnoir inventé ; une mention précise que le suivi panier n'est pas instrumenté.

**Étape 5 — Onglet « Paniers abandonnés »**
- Nouvelle page `src/pages/admin/AdminAbandonedCarts.tsx`, ajoutée à `src/config/adminSections.ts` et `Admin.tsx` (route `/admin/paniers-abandonnes`) avec les permissions existantes.
- Contenu :
  - liste fusionnée des commandes non payées et des paniers `cart_items`, avec montant, âge et articles ;
  - badge de consentement : « Opt-in confirmé » ou « Pas de consentement ».
- Bouton « Relancer » :
  - ouvre un aperçu de l'e-mail ;
  - il est désactivé sans opt-in ;
  - dans le brouillon, l'envoi réel reste bloqué par un drapeau `RECOVERY_SEND_ENABLED = false`.
- Aucune marque « relancé » enregistrée en base tant que l'envoi n'est pas validé : il faudra une colonne plus tard, sur une migration à approuver séparément.

**Étape 6 — Tests et validation avant intégration**
- Tests Vitest sur `metrics`, `compare` et `buckets` : remises, N-1, années bissextiles, dates WooCommerce, exclusion des tests.
- Contrôle TypeScript et build dans le brouillon.
- Vérification visuelle par Playwright en session admin, sur ordinateur et mobile 360 px, en lecture seule. Les requêtes réseau sont filtrées pour s'assurer qu'aucune écriture (POST/PATCH/DELETE) vers les tables n'est faite.
- Revue par vous dans la prévisualisation du brouillon, puis acceptation manuelle. Aucune publication automatique.

## Hors périmètre (à valider séparément)
- Instrumenter les événements « ajout au panier » et « début de paiement ».
- Créer une table de consentement ou de suivi des relances.
- Activer l'envoi réel des relances.

Chacun de ces points demande une écriture en base ou en production, donc un plan dédié.
