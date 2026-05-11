## Objectif

Quand `HeroErrorBoundary` se déclenche sur un navigateur, capturer automatiquement le contexte complet (erreur, stack, navigateur, viewport, URL) et le persister pour que tu puisses consulter chaque crash depuis le back-office, sans dépendre du F12 de l'utilisateur final.

## Ce qui sera fait

### 1. Nouvelle table `client_error_logs` (Lovable Cloud)

Colonnes :
- `id` (uuid)
- `created_at` (timestamptz)
- `source` (text) — ex. `hero_error_boundary`
- `label` (text nullable) — le `label` passé à la boundary
- `message` (text)
- `stack` (text)
- `component_stack` (text)
- `url` (text)
- `user_agent` (text)
- `viewport` (text) — `360x621`
- `pixel_ratio` (numeric)
- `console_tail` (jsonb) — les ~20 derniers messages console capturés
- `extra` (jsonb) — designSettings clés, route, etc.

RLS :
- INSERT autorisé pour tout le monde (anon + authenticated) — pour pouvoir logger même un visiteur non connecté.
- SELECT réservé aux admins (via `has_role(auth.uid(),'admin')`).
- Pas d'UPDATE / DELETE côté client.

### 2. Petit utilitaire `src/lib/clientErrorLogger.ts`

- Tampon circulaire (`ring buffer`) qui patche `console.log/warn/error` au boot pour conserver les ~20 derniers logs, sans affecter le rendu console natif.
- Fonction `logClientError({ source, label, error, componentStack, extra })` qui :
  - Construit le payload (UA, viewport, pixelRatio, URL, tail console).
  - Insère dans `client_error_logs` via le client Supabase.
  - Fallback `console.error` si l'insert échoue (réseau coupé, etc.).
  - Anti-spam : ne renvoie pas deux fois la même `message+stack` dans la même session.

### 3. Mise à jour de `HeroErrorBoundary.tsx`

- Dans `componentDidCatch`, en plus du `console.error` actuel, appeler `logClientError(...)` avec `source: 'hero_error_boundary'` et le `label` reçu.
- Aucun changement visuel du fallback.

### 4. Initialisation du ring buffer

- Importer/initialiser `installConsoleRingBuffer()` une seule fois dans `src/main.tsx` avant le `createRoot`, pour que les logs précédant un crash hero soient capturés.

### 5. Page admin légère pour consulter les crashes

Nouvelle route `/admin/audit/errors` (ou un onglet dans `AdminAudit.tsx` existant — à confirmer) :
- Liste paginée des 100 derniers `client_error_logs`, triés desc.
- Colonnes : date, source, label, message tronqué, navigateur (parsé du UA), viewport.
- Détail au clic : stack complète, component stack, console tail, extra JSON.
- Bouton "Copier" pour exporter un crash.

## Détails techniques

- Pas de service externe (Sentry, LogRocket) : tout reste dans Lovable Cloud.
- Aucun PII collecté (pas d'email, pas d'IP — Supabase log l'IP côté serveur seulement).
- Le ring buffer patche `console` en mode passthrough → zéro changement pour le dev.
- Anti-boucle : si l'insert Supabase lui-même échoue, on ne re-log pas l'erreur dans la même table.
- Les autres ErrorBoundary du projet pourront réutiliser `logClientError` plus tard (hors scope ici).

## Hors scope

- Pas de changement du fallback visuel.
- Pas de capture d'écran auto (trop coûteux côté client).
- Pas d'alerte email automatique sur erreur (peut être ajouté ensuite).
- Pas de retrofit sur les autres ErrorBoundary existantes — uniquement `HeroErrorBoundary`.

## Livrables

- 1 migration SQL (table + RLS + index sur `created_at`).
- `src/lib/clientErrorLogger.ts` (nouveau).
- `src/main.tsx` (init ring buffer).
- `src/components/home/HeroErrorBoundary.tsx` (appel logger).
- `src/pages/admin/AdminAudit.tsx` ou nouvelle page (UI consultation).
