# Audit complet du site avant mise en ligne

Objectif : passer en revue **tout le site** (front public + back-office admin), corriger les bugs restants, garantir la fluidité et le responsive (mobile 360px → desktop), et valider la sécurité avant publication.

---

## Phase 1 — Diagnostic technique automatisé

1. **Build & TypeScript** : compilation complète, résolution de toutes les erreurs TS/ESLint restantes.
2. **Audit Supabase** : exécution du linter DB (RLS, policies, fonctions sans `search_path`, index manquants).
3. **Scan sécurité** : exécution du scan sécurité (RLS, données exposées, secrets, edge functions).
4. **Audit dépendances** : vulnérabilités npm critiques/élevées.
5. **Console & réseau** : revue des warnings (ex. `Missing Description for DialogContent` déjà repéré) et requêtes en erreur.

## Phase 2 — Audit fonctionnel par parcours utilisateur

Pour chaque parcours, test en **mobile 360px**, **tablette 768px**, **desktop 1280px+** :

- **Accueil** : hero, slider, sections produits, bannière fidélité, popup newsletter, FAB roulette, chatbot.
- **Boutique & catégories** : filtres, tri, pagination, URLs propres, SEO.
- **Fiche produit** : galerie zoom 3.5x, sélecteur taille/couleur, ajout panier, recommandations.
- **Panier & Checkout** : 3 étapes, validation RPC, Colissimo (domicile + point relais), codes promo, calcul TVA.
- **Compte client** : inscription/login (email + Google), tableau de bord, commandes, profil, adresses, fidélité.
- **Pages légales** : CGV, Confidentialité, Cookies, Retours, Mentions légales, Guide des tailles, Fidélité.
- **Header** : icônes (compte, admin, notifications, messages, panier, langue, recherche, chatbot) — vérifier visibilité mobile et accessibilité.
- **Footer & Sidebar** : liens, comportement de réapparition.

## Phase 3 — Audit du Back-Office Admin

Test responsive (sidebar mobile sheet + desktop 240px) sur **toutes les sections** :
Dashboard, Live, Produits, Commandes, Préparations, Checkout, Clients, Pages, Média, Marketing, Roulette, Design, Icônes Accueil, Stock, Colissimo, Notifications, Chatbot, WooCommerce, Audit, Paramètres.

Pour chaque page admin :
- Affichage correct sur mobile (tableaux scrollables, formulaires lisibles).
- CRUD fonctionnel (create / read / update / delete).
- Sauvegardes manuelles explicites (pas d'auto-save).
- Permissions (admin vs stock_manager vs preparator).

## Phase 4 — Corrections

Selon les résultats des phases 1-3, corrections regroupées par priorité :

- **P0 Bloquant** : erreurs build, RLS manquantes, crashs, parcours achat cassé.
- **P1 Important** : bugs responsive, accessibilité (aria, focus), warnings console récurrents, SEO (meta, H1, alt).
- **P2 Polish** : micro-interactions, cohérence visuelle, performance (lazy load, taille images).

## Phase 5 — Validation finale

- Re-run linter Supabase + scan sécurité → 0 finding bloquant.
- Re-build → 0 erreur TS.
- Test parcours achat complet (mobile + desktop) avec capture preview.
- Vérification du `/admin/audit` interne (dashboard d'intégrité existant).

---

## Format du rapport livré

À la fin, je fournirai :
1. **Liste des problèmes trouvés** (regroupés P0/P1/P2) avec fichier concerné.
2. **Correctifs appliqués** (résumé des modifications).
3. **Points restants à valider manuellement** par toi (ex. tester un vrai paiement Colissimo, vérifier un envoi Resend réel).
4. **Checklist de mise en ligne** (DNS, domaine custom, visibilité publication, RGPD/cookies).

---

## Détails techniques

**Outils utilisés** : `supabase--linter`, `security--run_security_scan`, `code--dependency_scan`, lecture systématique des fichiers via `code--view`, navigation preview multi-viewport via les outils browser, `code--read_console_logs` / `code--read_network_requests`.

**Périmètre exclu** (sauf demande) :
- Tests E2E automatisés (non installés actuellement).
- Refonte design ou ajout de fonctionnalités (favoris, comparateur — déjà mentionnés mais non demandés ici).
- Migration de données ou changement d'architecture backend.

**Estimation** : audit + corrections P0/P1 sur plusieurs itérations. Je traiterai par lots cohérents et te donnerai un rapport intermédiaire à chaque phase pour que tu puisses valider avant de passer à la suite.
