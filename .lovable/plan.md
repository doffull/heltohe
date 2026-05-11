
# Plan — Sécurité fonctions, commande vocale, validation visuelle du publié

## 1. Sécuriser les fonctions SECURITY DEFINER

Le linter remonte **31 avertissements** : 5 policies trop permissives + 26 fonctions `SECURITY DEFINER` exécutables par tout le monde (anon ou authenticated) sans raison.

Audit terminé. Voici la classification cible :

| Fonction | Doit rester appelable par | Action |
|---|---|---|
| `has_role` | anon + authenticated (utilisée dans RLS) | Garder accès |
| `preview_promo_code` | anon + authenticated (panier invité) | Garder accès |
| `track_session_heartbeat`, `mark_popup_converted` | anon + authenticated (analytics public) | Garder accès |
| `spin_roulette` (les 2 signatures) | anon + authenticated (jeu visiteur) | Garder accès |
| `validate_and_create_order` | **authenticated uniquement** (déjà vérifie auth.uid() côté RPC via policy orders) | Révoquer anon |
| `redeem_loyalty_reward` | **authenticated uniquement** | Révoquer anon |
| `award_loyalty_points`, `consume_order_stock`, `release_order_stock`, `reserve_order_stock` | **service role / admin uniquement** (appelées par triggers ou edge functions) | Révoquer anon + authenticated |
| `get_newsletter_stats`, `list_users_by_role` | déjà gardées par `has_role` interne mais inutile d'exposer à anon | Révoquer anon |
| `trigger_award_loyalty_points`, `audit_role_change`, `auto_create_inventory_on_product_insert`, `auto_create_category_page`, `generate_category_slug`, `sanitize_techwear_hero`, `update_updated_at_column` | triggers internes uniquement | Révoquer anon + authenticated (laisser uniquement à postgres/service_role) |

Policies trop permissives à corriger :
- `visitor_sessions` UPDATE `USING (true)` → restreindre par `session_id` ou supprimer la policy (le heartbeat passe déjà par la RPC SECURITY DEFINER `track_session_heartbeat`).
- `click_events`, `page_views`, `client_error_logs`, `newsletter_popup_views` INSERT `WITH CHECK (true)` → ajouter une contrainte minimale (`session_id IS NOT NULL` ou rate limiting via index unique court terme) — sans casser l'analytics.

Une migration unique applique tous les `REVOKE EXECUTE … FROM anon, authenticated, public` ciblés et resserre les 5 policies. Aucun comportement utilisateur changé.

## 2. Corriger la commande vocale

Cause racine confirmée par test : l'edge function `voice-command` répond **HTTP 402 « Payment required »** depuis le gateway Lovable AI. Le code propage cette erreur vers le client qui affiche « Erreur lors du traitement vocal ». Ce n'est ni un bug navigateur ni un problème de permission micro.

Améliorations :

- **Côté edge function** (`supabase/functions/voice-command/index.ts`) :
  - Détecter explicitement les codes 402 / 429 / 5xx du gateway et renvoyer un payload structuré `{ error, userMessage }` au lieu d'une 500 opaque.
  - Garder un fallback local ultra-simple (regex sur "ajoute", "panier", "livraison", "domicile", "relais", "confirme") quand l'IA est indisponible, pour que l'utilisateur ne soit jamais bloqué.
  - Ajouter validation Zod stricte des entrées (transcript ≤ 1000, mode whitelist).

- **Côté UI** (`VoiceCommandFab.tsx`) :
  - Afficher un message clair selon le code (`402` → « Service vocal temporairement indisponible, réessayez dans quelques minutes » ; `429` → « Trop de requêtes »).
  - Stabiliser le `onresult` via `useRef` (pattern recommandé pour les API Speech) pour éviter les pertes silencieuses entre re-renders.
  - Synchroniser `speechSynthesis.speak()` au geste utilisateur (créer l'utterance dans le handler de bouton, pas après un `await`) pour Safari iOS.
  - Garder un toast dédié + bouton « Réessayer » plutôt que la simple toast d'erreur générique actuelle.

- **Crédits AI** : informer dans la chat que le 402 vient des crédits IA Lovable épuisés ou du quota de la clé — la correction code rend l'expérience propre, mais l'utilisateur devra recharger les crédits IA pour que la voix reprenne pleinement.

## 3. Validation visuelle automatique du rendu publié

Aujourd'hui `/admin/audit` couvre les routes, la DB, le storage et la logique métier mais ne **regarde** pas le rendu publié. Ajouts :

- Nouvelle section **« Rendu publié »** dans `AdminAudit.tsx` qui exécute, depuis le navigateur admin :
  1. `fetch('https://warltkfr.lovable.app/')` et vérifie `200 OK` + présence de `<title>` non vide + balise meta description.
  2. `fetch` du JSON `design_settings_public` côté client anonyme (sans session) → vérifie que `hud_logo`, `site_name`, `hero_slides` reviennent bien (c'était la racine du problème précédent : un 401 RLS rendait le site « tout noir »).
  3. Comparaison "preview vs publié" : compare `site_name`, taille du logo, et nombre de hero slides entre la valeur en base et celle servie publiquement → alerte si désynchro.
  4. Score visuel via une iframe cachée pointant sur `https://warltkfr.lovable.app/` : on attend 3 s puis on lit `iframe.contentDocument` quand same-origin (le site publié l'est) et on vérifie présence d'au moins un `<header>`, un `<main>`, un `<img>` chargé.

- Section **« Avant publication »** : bouton « Lancer la pré-publication ». Exécute les mêmes checks contre l'URL preview pour garantir parité dev↔publié, et bloque visuellement la publication si une régression est détectée (badge rouge dans le header admin).

- **Auto-monitoring** : un cron client toutes les 60 s côté `/admin` (uniquement) qui ping `design_settings_public` en mode anonyme et logge dans `client_error_logs` toute régression → notifications dans `/admin/errors`.

## Détails techniques

- Migration SQL unique pour partie 1 ; aucun changement de schéma, uniquement `REVOKE EXECUTE` + 5 réécritures de policies.
- Aucune modification de `validate_and_create_order` (déjà sûre) ni de `has_role` (utilisée par RLS).
- L'edge function `voice-command` reste publique (`verify_jwt = false` par défaut Lovable) — l'UX reste sans login obligatoire.
- L'audit visuel reste **côté client admin** : pas d'edge function supplémentaire, pas de coût IA.
- Le quota 402 du gateway IA n'est pas un bug code mais un état réel ; le plan ajoute juste une expérience dégradée propre.

## Ordre d'exécution

1. Migration SQL (sécurité fonctions + policies).
2. Patch `voice-command` edge function (gestion 402/429 + fallback regex).
3. Patch `VoiceCommandFab.tsx` (messages d'erreur clairs, useRef, gesture-safe TTS).
4. Section « Rendu publié » + bouton pré-publication dans `AdminAudit.tsx`.
5. Vérification : relancer le linter → 0 critique restant ; lancer l'audit `/admin/audit` complet ; tester la commande vocale en mode dégradé.
