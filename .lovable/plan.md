## Objectif
Rendre la synchronisation WooCommerce plus tolérante aux erreurs **503 / 502 / 504 / timeout** transitoires (ton serveur WP répond, mais l'API REST renvoie parfois "Service Unavailable" sous charge).

## Changements — `supabase/functions/woocommerce-import/index.ts`

### 1. Helper `fetchWithRetry`
- **Timeout par requête** : 25 s via `AbortController` (évite que la fonction reste bloquée jusqu'au shutdown Deno).
- **Retry automatique** : jusqu'à **4 tentatives** sur :
  - statuts `502`, `503`, `504`, `408`, `429`
  - erreurs réseau (`fetch failed`, `AbortError`)
- **Backoff exponentiel + jitter** : 1 s → 2 s → 4 s → 8 s (+/- 250 ms).
- Respect du header `Retry-After` quand WooCommerce le renvoie (429).
- Header `User-Agent: Lovable-WooSync/1.0` ajouté (certains WAF bloquent les User-Agent vides).

### 2. Mise à jour de `wcFetch`
- Utilise `fetchWithRetry` au lieu de `fetch` direct.
- Si après 4 tentatives c'est toujours 5xx → renvoie `WcServiceError` avec message clair :  
  *"Le serveur WooCommerce reste indisponible après plusieurs tentatives (erreur 503). Vérifie l'état de ton hébergement ou réessaie dans quelques minutes."*

### 3. Pagination plus douce
- `per_page=100` → **`per_page=50`** (réduit la charge par requête, première cause des 503 sur mutualisé).
- Petit délai de **150 ms entre les pages** pour ne pas saturer le serveur WP.

### 4. Frontend — `src/pages/admin/AdminWooCommerce.tsx`
- Affiche le **nombre de tentatives** dans le toast d'erreur si le retry a échoué.
- Bouton **"Réessayer"** qui relance le dernier import sans avoir à re-saisir les clés.

## Hors scope
- Pas de changement sur la logique métier (mapping produits/commandes/clients reste identique).
- Pas de migration DB.
- Pas de modification du connecteur WordPress.com (tu restes sur l'intégration WooCommerce custom).

## Et tes clés API ?
Tu n'as **pas besoin de me les passer**. L'edge function les reçoit en mémoire à chaque appel depuis le formulaire admin et ne les stocke jamais. Si tu veux qu'on les stocke comme secret pour ne pas les ressaisir, c'est une option séparée (à demander si besoin).
