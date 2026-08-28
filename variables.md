# VARIABLES — Helvetica MP

> Inventaire **exhaustif** des variables du projet : le nom, où la renseigner, à quoi elle sert,
> et ce qui casse si elle manque.
>
> Établi par analyse du dépôt (`8cb2c82`) : `import.meta.env` et `process.env` dans `src/`,
> `Deno.env.get()` dans `supabase/functions/`, tables de configuration dans `supabase/migrations/`.
> **Toute variable listée ici est réellement lue par le code** — les variables mortes sont
> isolées en §6.

---

## 1. Les quatre emplacements

Une variable de ce projet vit à l'un de ces quatre endroits. Les confondre est l'erreur la plus
fréquente et la plus coûteuse à diagnostiquer.

| # | Emplacement | Quoi | Visibilité |
|---|---|---|---|
| **1** | Fichier `.env` à la racine | variables `VITE_*` du front | **PUBLIQUES** — embarquées dans le bundle |
| **2** | Supabase → Edge Functions → Secrets | secrets serveur (Deno) | privées, jamais exposées au navigateur |
| **3** | Base de données (tables `*_config`, `*_secrets`) | réglages pilotés depuis `/admin` | selon RLS |
| **4** | Saisi à la volée dans l'UI | identifiants WooCommerce | non persisté (§5) |

> ⚠️ **Jamais de secret dans le `.env`.** Tout `VITE_*` finit en clair dans le JavaScript livré
> au navigateur. La `service_role key` n'a rien à y faire.

---

## 2. Front — fichier `.env` (variables `VITE_*`)

À copier depuis `.env.example`. Toutes sont publiques.

| Variable | Requis | Rôle | Si absente |
|---|---|---|---|
| `VITE_SUPABASE_URL` | **oui** | URL du projet Supabase | l'app ne démarre pas |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **oui** | clé anon (protégée par RLS) | l'app ne démarre pas |
| `VITE_SUPABASE_PROJECT_ID` | oui | identifiant projet | dysfonctionnements ponctuels |
| `VITE_PAYPAL_CLIENT_ID` | non | client ID PayPal — **repli sandbox uniquement** | voir l'encadré ci-dessous |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` | non | carte du localisateur de boutiques | `/trouver-une-boutique` dégradé |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID` | non | tracking associé à la carte | — |
| `VITE_LICENSE_DOMAINS` | non | domaines autorisés pour `build:protected` | **le verrou est inactif** (§6) |

Où les trouver : Dashboard Supabase → *Project Settings → API*.

### ⚠️ PayPal : la base gagne toujours sur le `.env`

`src/hooks/usePayPalConfig.ts` applique cette règle :

```ts
const fromDb = environment === 'live' ? clientIdLive : clientIdSandbox;
return fromDb || (environment === 'live' ? '' : ENV_PAYPAL_CLIENT_ID);
```

**En live il n'y a aucun repli.** Si `client_id_live` est vide dans la table `paypal_config`, le
client ID vaut `""` et le bouton PayPal ne se charge pas — même avec `VITE_PAYPAL_CLIENT_ID`
parfaitement renseigné. En production, tout se règle dans `/admin/paypal`, jamais ici.

---

## 3. Front — variables **sans** préfixe `VITE_`

Ces deux-là ne sont **pas** dans `.env.example` et ne sont **pas** des variables Vite : elles sont
lues par `process.env` dans `src/lib/mcp/tools/*` (serveur MCP exécuté par Node, hors bundle).

| Variable | Où | Rôle |
|---|---|---|
| `SUPABASE_URL` | environnement du process Node qui lance le serveur MCP | client Supabase des outils MCP |
| `SUPABASE_PUBLISHABLE_KEY` | idem | idem |

Consommée par : `add-to-wishlist`, `remove-from-wishlist`, `list-wishlist`, `list-products`,
`list-boutiques`. Le code les déréférence avec `!` (non-null assertion) : si elles manquent, l'outil
plante à l'exécution, sans message clair.

### Variable de build

| Variable | Où | Rôle |
|---|---|---|
| `PROTECT` | ligne de commande | `PROTECT=1` active l'obfuscation du JS (`vite.config.ts:57`). Déjà positionnée par le script `bun run build:protected`. |

---

## 4. Edge Functions — secrets Supabase

À déclarer dans **Supabase → Edge Functions → Secrets**, ou :

```bash
supabase secrets set NOM=valeur
```

En développement local : fichier `supabase/functions/.env` (chargé par `supabase start`).

**Ne jamais les mettre dans le `.env` de la racine — ils n'y seraient pas lus.**

### 4.1 Injectés automatiquement par la plateforme — rien à faire

| Variable | Note |
|---|---|
| `SUPABASE_URL` | utilisée par 25 occurrences |
| `SUPABASE_ANON_KEY` | clé legacy, respecte RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **contourne RLS** — ne jamais exposer côté navigateur |

### 4.2 À déclarer manuellement

| Variable | Fonctions consommatrices | Rôle |
|---|---|---|
| `LOVABLE_API_KEY` | **19 fonctions** (dont `_shared/gemini.ts`) | passerelle IA `ai.gateway.lovable.dev` (Gemini/GPT) |
| `SUPABASE_JWT_SECRET` | `spin-roulette` | signature/vérification de jeton. **N'est pas** un secret par défaut Supabase : à récupérer dans *Project Settings → API → JWT Secret* |
| `PAYPAL_LIVE_CLIENT_ID` | `paypal`, `paypal-webhook` | PayPal production |
| `PAYPAL_LIVE_CLIENT_SECRET` | `paypal`, `paypal-webhook` | PayPal production |
| `PAYPAL_SANDBOX_CLIENT_ID` | `paypal`, `paypal-webhook` | PayPal test |
| `PAYPAL_SANDBOX_CLIENT_SECRET` | `paypal`, `paypal-webhook` | PayPal test |
| `COLISSIMO_LOGIN` | `colissimo-proxy`, `create-colissimo-label` | compte contrat Colissimo |
| `COLISSIMO_PASSWORD` | `colissimo-proxy`, `create-colissimo-label` | idem |
| `LAPOSTE_API_KEY` | `colissimo-proxy` | API points relais La Poste |
| `RESEND_API_KEY` | `send-order-confirmation`, `send-order-notification`, `crm-send-message` | e-mail transactionnel |
| `BREVO_API_KEY` | `crm-send-message` | second canal e-mail |
| `TWILIO_API_KEY` | `send-order-notification` | SMS — **passe par le connecteur Lovable**, donc `LOVABLE_API_KEY` est aussi requise, et le numéro d'envoi vient de `notification_config.sms_from_number` (base) |
| `GOOGLE_MAPS_API_KEY` | `boutique-lookup` | clé **serveur**, distincte de la clé navigateur du §2 |
| `LAPOSTE_TRACKING_API_KEY` | `poll-carrier-tracking` | suivi de colis La Poste — **distincte** de `LAPOSTE_API_KEY`, qui sert aux points relais |
| `CARRIER_WEBHOOK_TOKEN` | `carrier-tracking-webhook` | jeton partagé qui authentifie les appels entrants du transporteur. Sans lui, l'endpoint accepterait n'importe quel statut de livraison |

Depuis le 27/08/2026, `RESEND_API_KEY` est également lue par `send-order-status-email`
(notification de changement de statut) et `auth-email-hook` (e-mails d'authentification
personnalisés), et `LOVABLE_API_KEY` par `ai-keys`.

> 💰 **`LOVABLE_API_KEY` est le premier poste de facture.** 19 des 31 fonctions l'utilisent, dont la
> génération d'images et de vidéos, et 21 fonctions sont publiques (`verify_jwt = false`) sans
> limitation de débit. Voir PROJECT.md §9.

---

## 5. Base de données — réglages pilotés depuis `/admin`

Ce ne sont pas des variables d'environnement mais des **lignes en base**. Elles se renseignent
exclusivement depuis le back-office, jamais dans un fichier.

| Table | Écran | Contenu |
|---|---|---|
| `paypal_config` | `/admin/paypal` | `environment` (sandbox/live), `client_id_sandbox`, `client_id_live`, `webhook_id`, `currency`, `locale`, `intent`, boutons et placements |
| `payment_gateway_secrets` | Admin → Paiement & Livraison | `gateway` + `secret_key`. Passerelles acceptées : `stripe`, `payplug`, `mollie`, `klarna`, `paypal` (`payment-keys/index.ts:16`) — **seul `payplug` a une edge function implémentée** |
| `messaging_config` | Admin → Messagerie | `default_from_email`, `default_from_name`, `provider` (resend/brevo), `signature` |
| `notification_config` | Admin → Notifications | déclencheurs, canaux email/SMS, `sms_from_number`, gabarits e-mail et SMS |
| `admin_config`, `bot_config`, `checkout_config`, `design_settings`, `roulette_config`, `category_hero_settings` | écrans `/admin/*` dédiés | réglages fonctionnels (voir PROJECT.md) |

> 🔐 `payment_gateway_secrets` est en RLS avec `REVOKE ALL ... FROM anon, authenticated` : seul le
> `service_role` y accède, via l'edge function `payment-keys`. Le front ne lit jamais que `last4`.

### WooCommerce — le quatrième emplacement

Les identifiants d'import (`storeUrl`, `consumerKey`, `consumerSecret`) **ne sont stockés nulle
part** : ils sont saisis dans le formulaire `/admin/woocommerce` (simples `useState`) et transmis
dans le corps de la requête à `woocommerce-import`. Ils sont donc à ressaisir à chaque import.

---

## 6. Variables mortes et pièges

| Variable | Statut |
|---|---|
| `VITE_LICENSE_KEY` | **jamais lue par le code.** Mentionnée dans l'en-tête de `licenseGuard.ts`, la renseigner n'a aucun effet |
| `VITE_LICENSE_DOMAINS` vide | **le verrou de licence ne protège rien** : un `build:protected` sans cette variable démarre partout. Toujours autorisés quoi qu'il arrive : `localhost`, `127.0.0.1`, `0.0.0.0`, `*.lovable.app`, `*.lovableproject.com`, `*.lovable.dev` |
| Clés `lvtk:` | l'ancien nom du projet (`LVTK6`) survit dans les clés `localStorage` et les événements DOM. **Ne pas renommer sans migration** : ça déconnecte les sessions et vide les paniers en cours |

---

## 7. Vérifier l'inventaire après une évolution

```bash
# Front — variables Vite réellement consommées
grep -rhoE "import\.meta\.env\.[A-Za-z_]+" src | sort -u

# Front — variables Node hors bundle (serveur MCP)
grep -rhoE "process\.env\.[A-Za-z_]+" src vite.config.ts | sort -u

# Edge functions — secrets réellement lus
grep -rhoE "Deno\.env\.get\(['\"][A-Z_]+['\"]\)" supabase/functions | sort -u

# Quelles fonctions consomment un secret donné
grep -rl "LOVABLE_API_KEY" supabase/functions | cut -d/ -f3 | sort -u
```

---

## 8. Mise en route rapide

1. `cp .env.example .env`, puis renseigner les trois `VITE_SUPABASE_*` — sans elles, rien ne démarre.
2. Déclarer les secrets du §4.2 dans Supabase (au minimum `LOVABLE_API_KEY`, sinon toutes les
   fonctionnalités IA renvoient une erreur).
3. Configurer les paiements **en base**, depuis `/admin/paypal` et Admin → Paiement & Livraison —
   pas dans le `.env`.
4. Pour un build protégé : `VITE_LICENSE_DOMAINS=mondomaine.fr bun run build:protected`.
