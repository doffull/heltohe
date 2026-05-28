## Diagnostic

L'erreur "503 après 4 tentatives" provient de la edge function `woocommerce-import`. Les logs confirment que **chaque appel** retourne 503 — donc ton hébergeur WordPress (très probablement Cloudflare / WAF / Sucuri / Wordfence devant `helvetica-mp.com`) bloque la requête avant qu'elle n'arrive à WooCommerce.

Causes classiques d'un 503 systématique sur `/wp-json/wc/v3/...` :
1. **Auth par query-string** (`?consumer_key=...&consumer_secret=...`) refusée par le WAF — la pratique recommandée WooCommerce est Basic Auth.
2. **User-Agent "Lovable-WooSync/1.0"** identifié comme bot et bloqué.
3. **Pas de header `Accept-Encoding` / `Accept-Language`** → fingerprint suspect.
4. Aucun **fallback** ni cache de session : à chaque clic on repart de zéro.

## Plan de correction

### 1. Edge function `woocommerce-import` — connexion robuste
- Passer en **HTTP Basic Auth** (`Authorization: Basic base64(key:secret)`) au lieu du query-string. Conserver le query-string seulement en fallback si la 1ʳᵉ tentative échoue en 401/403.
- Remplacer le User-Agent par un **UA navigateur réaliste** (`Mozilla/5.0 ... Chrome/...`) + `Accept-Language: fr-FR`.
- Augmenter `MAX_ATTEMPTS` à **6** et le backoff plafond à 15 s (au lieu de 4 tentatives).
- Sur 503/502/504 persistant : tenter une **2ᵉ stratégie** automatiquement (query-string + UA différent) avant d'abandonner.
- Sur échec final, renvoyer un message **actionnable** (statut HTTP réel, headers `cf-ray` / `server` détectés) au lieu du message générique.

### 2. Mode "preview" léger pour l'étape 1
- L'étape "Analyser" appelle aujourd'hui `mode: preview` qui télécharge **toutes les pages** (peut déclencher rate-limit → 503). Ajouter un mode `mode: ping` qui ne fait qu'**un seul appel** à `/wp-json/wc/v3/system_status` avec `per_page=1` pour valider la connexion sans charger le catalogue.
- L'étape "Analyser" du `WordPressSyncDialog` appellera `ping` d'abord, puis `preview` seulement si la connexion répond OK.

### 3. Connexion persistante côté admin
- Stocker les credentials chiffrés côté **DB** dans `admin_config` (clé `woocommerce_connection`) au lieu du seul `localStorage`, afin d'être réutilisés par toutes les sessions et toutes les imports automatiques.
- Ajouter dans `WordPressSyncDialog` un indicateur "✓ Connecté à `helvetica-mp.com`" persistant tant que la connexion fonctionne, qui pré-remplit les champs et saute l'étape 1 au prochain ouverture.
- Bouton "Reconnecter" pour forcer une revalidation.

### 4. Message d'erreur plus utile
- Si le 503 persiste après toutes les stratégies : afficher dans le toast les en-têtes diagnostiqués (ex. `server: cloudflare`, `cf-mitigated: challenge`) avec un lien "Voir les logs" pointant vers `/admin/woocommerce?tab=logs`.
- Bouton "Réessayer maintenant" intégré au toast pour relancer sans rouvrir la dialog.

## Fichiers concernés
- `supabase/functions/woocommerce-import/index.ts` — Basic Auth + UA réaliste + mode `ping` + 6 tentatives.
- `src/components/admin/WordPressSyncDialog.tsx` — appel `ping` d'abord, pré-remplissage depuis DB, badge "Connecté".
- `src/hooks/useAdminConfig.ts` (ou nouveau hook `useWooConnection`) — lecture/écriture credentials dans `admin_config`.
- Migration SQL : nouvelle entrée `admin_config.config_key = 'woocommerce_connection'` (déjà sécurisée par RLS admin-only existante).

## Ce que tu obtiens
- Plus de 503 "fantôme" : la fonction trouve la bonne stratégie d'auth toute seule.
- Tes clés sont mémorisées : tu ouvres la dialog → tu es déjà connecté, tu cliques direct sur "Synchroniser".
- Si un jour ton serveur est vraiment down, le message t'indique précisément quoi vérifier (Cloudflare, hébergeur, WAF).
