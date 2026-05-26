# Plan d'implémentation

Travail séquentiel avec vérification (build + smoke test console/network) après chaque bloc.

---

## 1. Rôle "auditor" (lecture seule + audit/logs)

**Backend**
- Ajouter `'auditor'` à l'enum `app_role`.
- Politiques RLS additionnelles `SELECT` pour `auditor` sur : `orders`, `products`, `customers` (sans email/téléphone exposés via une vue), `error_logs`, `role_audit_log`, `design_settings`, `inventory`, `stock_levels`.
- **Aucune** policy INSERT/UPDATE/DELETE pour `auditor`.
- Mise à jour `hasAdminPanelAccess` dans `AuthContext` → ajouter `isAuditor`.

**Frontend**
- Sidebar admin : pour `auditor`, n'afficher que `Dashboard`, `Audit`, `Error Logs`, `Security` (nouveau).
- Guard `<RequireRole>` qui bloque routes non-autorisées avec redirection vers `/admin/audit`.
- Composant global `<ReadOnlyGuard>` qui désactive boutons "Enregistrer / Supprimer / Modifier" si `isAuditor`.
- Page `/admin/roles` : permettre à l'admin de créer un compte auditor (invite par email + assignation du rôle).

---

## 2. Tableau de bord `/admin/security`

Nouvelle page agrégeant :
- **Erreurs JS récentes** (depuis `error_logs`, 7 derniers jours, groupées par message).
- **Tentatives de connexion échouées** (depuis `auth.audit_log_entries` via RPC `security_definer`).
- **Audit RLS** : liste des tables sans RLS activée, fonctions sans `search_path`, vues `SECURITY DEFINER` (RPC qui lit `pg_catalog`).
- **Intégrité RPC** : check que les fonctions critiques (`validate_and_create_order`, `spin_roulette`) existent toujours.
- **Score global** : 0–100 calculé côté serveur.
- Bouton "Re-scan maintenant" qui appelle une edge function `security-scan`.

---

## 3. Cache intelligent + invalidation au publish

**Cache client**
- React Query : `staleTime` long (5 min) pour données semi-statiques (`design_settings`, `categories`, `products` listing), court (0) pour `orders`, `cart`.
- Service Worker (Workbox via vite-plugin-pwa) : cache `network-first` pour HTML, `stale-while-revalidate` pour assets hashés.

**Invalidation automatique au publish**
- Fichier `public/version.json` régénéré au build avec un hash unique (plugin Vite).
- Hook `useAppVersion` qui poll `/version.json` toutes les 60 s. Si le hash change → toast "Nouvelle version disponible" + `window.location.reload(true)` + `caches.delete()` + `queryClient.clear()`.
- Headers `Cache-Control: no-cache` sur `index.html` et `version.json` via meta tags + SW.

---

## 4. Jeu de tirage au sort par cartes (remplace la roulette)

**Nouveau composant** `CardLuckyDraw` (mobile-first 360px) :
- Affiche 5 cartes face cachée alignées (grid responsive : 5 colonnes desktop, 2 lignes × 3 mobile).
- Animation flip 3D au clic sur la carte choisie (CSS `transform: rotateY` + perspective).
- Confettis légers à la révélation.
- Réutilise **intégralement** la table `roulette_segments` (cartes = segments actifs) et la RPC `spin_roulette` côté backend — aucune migration nécessaire.
- Renomme `RouletteFab` → `LuckyDrawFab` ; le label admin reste "Jeu-concours".
- La vieille roulette canvas est supprimée, mais la config admin (`AdminRoulette`) est conservée et adaptée (label "Cartes" au lieu de "Segments").

---

## 5. Popup CGV bloquant à la 1ère visite

- Composant `<CgvConsentGate>` monté dans `App.tsx`, rendu **au-dessus** de tout le contenu si pas de consentement.
- Stockage : `localStorage` (`cgv_consent_v1` = `{ version, acceptedAt }`) + table `cgv_consents` (id, session_hash, ip_hash, version, accepted_at, user_agent) via RPC `record_cgv_consent`.
- Versionning : si on change `cgv_version` dans `design_settings`, le popup réapparaît.
- Bouton **Refuser** → écran de blocage avec lien externe (google.com) et message "Vous devez accepter les CGV pour utiliser ce site".
- Bouton **Accepter** → ferme le gate.
- Lien "Lire les CGV" → ouvre `/cgv` dans nouvel onglet sans fermer le popup.

---

## 6. Popup newsletter récurrent

> ⚠️ Toutes les 20–30 s c'est **agressif** (risque SEO + UX). Implémentation choisie :
> **1ère apparition à 30 s, puis si fermé sans inscription → réapparition toutes les 5 min jusqu'à 3 fois max par session**, puis plus jamais avant 24 h.
> Si tu confirmes vouloir vraiment 20–30 s strict, dis-le et j'ajuste.

- Réutilise le système `newsletter_popups` existant (`NewsletterPopupHost`).
- Ajout d'un mode `recurring` dans `display_trigger` avec `interval_seconds` et `max_per_session`.
- Inscription = arrête définitivement la récurrence (localStorage flag).

---

## 7. Vérification systématique après chaque bloc

Après chaque tâche ci-dessus :
1. Build TypeScript propre (auto par le harness).
2. Smoke test : ouvrir route concernée, lire `console` + `network` pour repérer 4xx/5xx ou erreurs JS.
3. Si admin/auditor : login dans les deux rôles et vérifier les permissions.

---

## Ordre d'exécution proposé

1. **Rôle auditor** (migration + AuthContext + guards) → vérif
2. **Dashboard /admin/security** (RPC + UI) → vérif
3. **Jeu de cartes** (remplace roulette, mobile-first) → vérif
4. **Popup CGV bloquant** → vérif
5. **Newsletter récurrent** → vérif
6. **Cache + invalidation publish** (en dernier car SW impacte tout) → vérif complète

---

## Détails techniques

- **Nouvelles migrations** : enum `auditor`, table `cgv_consents`, RPC `record_cgv_consent`, RPC `security_audit_snapshot`, policies SELECT auditor.
- **Nouvelles edge functions** : `security-scan` (cron quotidien optionnel à activer plus tard).
- **Nouveaux fichiers front** :
  - `src/pages/admin/AdminSecurity.tsx`
  - `src/components/security/CgvConsentGate.tsx`
  - `src/components/home/CardLuckyDraw.tsx` (+ FAB renommé)
  - `src/hooks/useAppVersion.ts`
  - `src/lib/auditorPermissions.ts`
- **Vite plugins** : `vite-plugin-pwa` pour SW.
- **Pas de modification** de `client.ts`, `types.ts`, ni du `config.toml` (sauf si edge function avec config spécifique).

Confirme ce plan (ou demande des ajustements, notamment sur la fréquence du popup newsletter) et je lance l'implémentation bloc par bloc.