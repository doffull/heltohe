# VARIABLES — Helvetica MP

> **Inventaire complet des variables du projet** : ce que chacune fait, et **où on la
> renseigne**. Réécrit le 28/08/2026 par relecture du code (`7d0af17d`), après le changement
> de dépôt (PROJECT.md §16) qui a ajouté le suivi de colis, les e-mails d'authentification et
> la gestion des clés IA.
>
> La question à se poser n'est jamais « quelle est la valeur ? » mais **« quel emplacement
> gagne ? »** : plusieurs clés existent à deux endroits, et c'est presque toujours la base de
> données qui l'emporte sur les secrets.
>
> Pour vérifier que cet inventaire est encore exact après une évolution, voir le §7.

---

## 1. Les quatre emplacements

| # | Emplacement | Qui le lit | Comment on le renseigne |
|---|---|---|---|
| 1 | **`.env`** à la racine | le front, au **build** (Vite) | fichier local, **jamais commité** — `.env.example` sert de modèle |
| 2 | **Environnement du shell** | les scripts hors bundle (SEO, MCP, build protégé) | variables exportées, ou lues dans le `.env` par le script lui-même |
| 3 | **Secrets Supabase** | les 36 edge functions | *Dashboard → Edge Functions → Secrets*, ou `supabase secrets set` |
| 4 | **Base de données** | le front **et** les edge functions | écrans `/admin/*`, sans intervention technique |

⚠️ **Un `VITE_*` n'est pas un secret.** Tout ce qui porte ce préfixe est inscrit en clair dans
le JavaScript livré au navigateur. N'y mettre que du public : clé *publishable* Supabase,
client ID PayPal, clé Maps **restreinte par référent**. Une clé secrète va en emplacement 3.

---

## 2. Front — fichier `.env` (variables `VITE_*`)

| Variable | Obligatoire | Rôle | Si absente |
|---|---|---|---|
| `VITE_SUPABASE_URL` | **oui** | URL du projet Supabase | l'application ne démarre pas |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **oui** | clé publique (anon) du projet | l'application ne démarre pas |
| `VITE_SUPABASE_PROJECT_ID` | non | identifiant du projet, à titre indicatif | — |
| `VITE_SITE_URL` | recommandé | **domaine public du site** : source unique des URLs absolues — canonical, Open Graph, `sitemap.xml`, `robots.txt`, aperçu de l'éditeur visuel | repli sur `https://helvetica-mp.com` (`src/lib/site.ts`) |
| `VITE_PAYPAL_CLIENT_ID` | non | client ID PayPal public — **repli** si l'admin n'en a pas saisi en base | repli sur `"test"` : boutons PayPal en mode démo |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` | non | carte du localisateur de boutiques | `/trouver-une-boutique` en mode dégradé |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID` | non | identifiant de suivi associé à la carte | — |
| `VITE_LICENSE_DOMAINS` | non | domaines autorisés à exécuter l'application (`src/lib/licenseGuard.ts`) | garde-fou inactif, tous les domaines passent |

### ⚠️ PayPal : la base gagne sur le `.env`

`VITE_PAYPAL_CLIENT_ID` n'est qu'un **repli**. Le client ID réellement utilisé vient de la
table `paypal_config` (`client_id_sandbox` / `client_id_live` selon `environment`), pilotée
depuis **`/admin/paypal`**. Modifier le `.env` sans vider ce champ en base ne change rien.

Côté **serveur**, c'est l'inverse : les identifiants qui signent réellement les paiements
(`PAYPAL_*_CLIENT_SECRET`) sont lus **uniquement** dans les secrets Supabase, jamais en base.
La table ne décide que de l'environnement (`sandbox` / `live`) et des options d'affichage.

---

## 3. Front — variables **sans** préfixe `VITE_`

Elles ne partent pas dans le bundle : elles servent aux outils qui tournent **avant ou autour**
du build.

| Variable | Lue par | Rôle |
|---|---|---|
| `VITE_SITE_URL` | `scripts/generate-seo-files.mjs`, `vite.config.ts` | même variable qu'au §2, mais lue ici côté **Node**. Le script la cherche dans l'environnement, puis dans `.env.local`, puis dans `.env` |
| `SUPABASE_URL` | `supabase/functions/mcp/index.ts` (serveur MCP local) | projet ciblé par l'outillage MCP |
| `SUPABASE_PUBLISHABLE_KEY` | idem | clé publique pour le même usage |
| `PROTECT` | `vite.config.ts` | `PROTECT=1` active l'obfuscation du JavaScript émis (`npm run build:protected`) |

### Le domaine de repli est écrit à deux endroits

`https://helvetica-mp.com` figure dans `src/lib/site.ts` **et** dans
`scripts/generate-seo-files.mjs` — le second s'exécute hors du bundle Vite et ne peut donc pas
importer le premier. **Garder les deux valeurs alignées.**

---

## 4. Edge Functions — secrets Supabase

### 4.1 Injectés par la plateforme — rien à faire

| Variable | Rôle |
|---|---|
| `SUPABASE_URL` | URL du projet |
| `SUPABASE_ANON_KEY` | clé publique, pour agir **au nom de l'appelant** (RLS appliquée) |
| `SUPABASE_SERVICE_ROLE_KEY` | clé d'administration : **contourne la RLS**. À réserver aux fonctions qui ont déjà vérifié les droits |

### 4.2 À déclarer manuellement

| Variable | Fonctions consommatrices | Rôle |
|---|---|---|
| `LOVABLE_API_KEY` | **21 fonctions sur 36** — 11 directement, 12 via `_shared/gemini.ts` | passerelle IA `ai.gateway.lovable.dev`. Sert **aussi** de secret de signature au webhook d'e-mails d'authentification (`auth-email-hook`) |
| `GEMINI_API_KEY` | `_shared/gemini.ts`, `ai-keys` | clé Google Gemini en accès direct. Repli : **la base gagne** (§5) |
| `SUPABASE_JWT_SECRET` | `spin-roulette` | signature de jeton. **N'est pas** injecté par défaut : à récupérer dans *Project Settings → API → JWT Secret* |
| `PAYPAL_LIVE_CLIENT_ID` · `PAYPAL_LIVE_CLIENT_SECRET` | `paypal`, `paypal-webhook` | PayPal production |
| `PAYPAL_SANDBOX_CLIENT_ID` · `PAYPAL_SANDBOX_CLIENT_SECRET` | `paypal`, `paypal-webhook` | PayPal test |
| `COLISSIMO_LOGIN` · `COLISSIMO_PASSWORD` | `colissimo-proxy`, `create-colissimo-label` | compte contrat Colissimo : points relais et bordereaux |
| `LAPOSTE_API_KEY` | `colissimo-proxy` | API **points relais** La Poste |
| `LAPOSTE_TRACKING_API_KEY` | `poll-carrier-tracking`, `tracking-key` | API **suivi de colis** La Poste — **différente** de la précédente. Repli : la base gagne (§5) |
| `CARRIER_WEBHOOK_TOKEN` | `carrier-tracking-webhook` | jeton partagé authentifiant les appels entrants du transporteur. Sans lui, l'endpoint accepterait n'importe quel statut de livraison. Repli : la base gagne (§5) |
| `RESEND_API_KEY` | `_shared/mailer.ts` → **les 11 fonctions d'envoi** (commandes, newsletters, accès, réinit. mot de passe, CRM…) | e-mail transactionnel — **en direct** (`api.resend.com`), plus aucun passage par le connecteur Lovable. **Sans elle, aucun e-mail ne part** |
| `SEND_EMAIL_HOOK_SECRET` | `auth-email-hook` | signe les requêtes du Send Email Hook (`v1,whsec_…`), donné par le dashboard à la création du hook. Sans elle la fonction répond 401 |
| `MAIL_FROM` | `_shared/mailer.ts` → les 11 fonctions ci-dessus | adresse d'expédition unique. ⚠️ domaine à vérifier dans Resend (SPF + DKIM). Absente → repli sur `onboarding@resend.dev` + avertissement en logs |
| `MAIL_FROM_NAME` | idem | nom affiché. Défaut : `HELVETICA-MP` |
| `MAIL_REPLY_TO` | idem | adresse de réponse. Absente → repli sur `MAIL_FROM`. Son domaine n'a pas à être vérifié |
| `ADMIN_EMAIL` | `_shared/mailer.ts` (`adminEmailAddress()`) → `send-order-confirmation` | destinataire des alertes internes (copie admin des commandes). Absente → repli sur `MAIL_FROM` |
| `BREVO_API_KEY` | `crm-send-message` | second canal e-mail |
| `TWILIO_API_KEY` | `send-order-notification` | SMS — passe par le connecteur Lovable, donc `LOVABLE_API_KEY` est **aussi** requise ; le numéro d'expédition vient de `notification_config.sms_from_number` |
| `GOOGLE_MAPS_API_KEY` | `boutique-lookup` | clé **serveur**, distincte de la clé navigateur du §2 |

> 💰 **`LOVABLE_API_KEY` est le premier poste de facture** : génération d'images et de vidéos
> comprises, et **22 fonctions sur 36 sont publiques** (`verify_jwt = false`) sans limitation
> de débit. Voir PROJECT.md §9.

---

## 5. Base de données — le coffre `payment_gateway_secrets`

Malgré son nom, cette table ne sert plus qu'aux paiements : c'est le **coffre à clés générique**
du projet. Une ligne = une clé, identifiée par la colonne `gateway`.

| `gateway` | Contenu | Écran de saisie | Repli si la ligne est absente |
|---|---|---|---|
| `payplug` | clé secrète PayPlug | `/admin/checkout` | aucun — PayPlug est désactivé |
| `gemini_api` | clé Google Gemini | `/admin/chatbot` | secret `GEMINI_API_KEY`, puis la passerelle Lovable |
| `laposte_tracking` | clé API de suivi de colis | `/admin/colissimo` | secret `LAPOSTE_TRACKING_API_KEY` |
| `carrier_webhook` | jeton du webhook transporteur | `/admin/colissimo` | secret `CARRIER_WEBHOOK_TOKEN` |

**Règle constante : la base d'abord, le secret Supabase en repli.** Le code lit
`secret_key || Deno.env.get(...)`. Conséquence pratique : **changer un secret Supabase reste
sans effet tant que la ligne existe en base.** Les écrans d'admin affichent d'ailleurs la
source réellement retenue (`database` ou `env`).

---

## 6. Base de données — réglages pilotés depuis `/admin`

Ce ne sont pas des variables d'environnement, mais elles en jouent le rôle : elles changent le
comportement du site **sans redéploiement**. Ces tables utilisent une ligne unique identifiée
par `config_key = 'main'`.

| Table | Écran | Ce qu'elle pilote |
|---|---|---|
| `design_settings` | `/admin/design`, `/admin/seo` | identité du site (`site_name`, `site_tagline`), **tout le SEO** (`seo_default_title`, `seo_default_description`, `seo_og_image`, `seo_keywords`, `seo_indexable`, `seo_noimageindex`, `seo_redirects`), mode maintenance |
| `checkout_config` | `/admin/checkout` | prix livraison domicile / relais, seuil de franco, modes activés, message du tunnel |
| `paypal_config` | `/admin/paypal` | environnement PayPal, client IDs publics, boutons affichés (Pay Later, wallets, Venmo, messaging) |
| `notification_config` | `/admin/notifications` | déclencheurs de notification, canaux, gabarits e-mail et SMS, numéro d'expédition SMS |
| `messaging_config` | `/admin/messagerie` | expéditeur par défaut (adresse, nom), fournisseur, signature |
| `admin_config` | `/admin/parametres` | e-mail de notification admin, **adresse d'expédition Colissimo** (nom, rue, code postal, ville) |
| `bot_config` | `/admin/chatbot` | prompt système, nom et avatar du bot, suggestions — et les **modèles IA** (`chat_model`, `voice_model`, `ai_default_model`, `ai_vision_model`), lus par `_shared/gemini.ts` avec repli codé en dur |
| `roulette_config` | `/admin/roulette` | activation, textes, délai de réapparition, validité des lots |
| `category_hero_settings` | `/admin/design` | visuels d'en-tête par catégorie |

> Les vues `*_public` (`design_settings_public`, `bot_config_public`, `checkout_config_public`,
> `paypal_config_public`, `roulette_config_public`) exposent au visiteur non connecté un
> sous-ensemble **sans secrets**. Ajouter une colonne sensible à une table de config sans
> vérifier sa vue publique, c'est la publier.

---

## 7. Vérifier l'inventaire après une évolution

```bash
# Front — variables Vite réellement consommées
grep -rhno "import\.meta\.env\.[A-Za-z_]*" src/ | sed 's/.*env\.//' | sort -u

# Hors bundle — scripts Node, build, serveur MCP
grep -rn "process\.env\.[A-Za-z_]*" src/ scripts/ vite.config.ts supabase/functions/mcp/index.ts

# Edge functions — quel secret, lu par quelle fonction
for d in supabase/functions/*/; do
  for v in $(grep -rhoE "Deno\.env\.get\(['\"][A-Z0-9_]+" "$d" | sed -E "s/.*['\"]//" | sort -u); do
    echo "$v <- $(basename "$d")"
  done
done | sort

# Coffre à clés — quelles passerelles sont stockées en base
grep -rhoE "gateway['\"]?\s*[:,=]\s*['\"][a-z_]+" src/ supabase/functions/ | sort -u
```

---

## 8. Mise en route rapide

1. `cp .env.example .env`, puis renseigner `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_PUBLISHABLE_KEY` (*Dashboard → Project Settings → API*).
2. Ajouter `VITE_SITE_URL=https://helvetica-mp.com` — sinon sitemap et canonical partent sur
   le domaine de repli, ce qui passe inaperçu jusqu'à ce que Google s'en mêle.
3. Déclarer les secrets du §4.2 utiles à ce que vous testez. **Rien n'est requis pour faire
   tourner la boutique en lecture** ; les paiements, l'IA, les e-mails et Colissimo, si.
4. Le reste se règle dans `/admin`, sans toucher au code.

---

## 9. Pièges connus

- **Un secret Supabase modifié qui « ne fait rien »** → la base gagne. Vérifier
  `payment_gateway_secrets` (§5) avant de chercher ailleurs.
- **`LAPOSTE_API_KEY` et `LAPOSTE_TRACKING_API_KEY` sont deux clés différentes** chez le même
  fournisseur : points relais d'un côté, suivi de colis de l'autre. Les intervertir donne un
  403 difficile à lire.
- **Le domaine de repli est dupliqué** (§3). Il l'a déjà été de travers : en août 2026, le
  dépôt portait trois domaines différents, dont un `helvetica-mp.helvetica-mp.net`. Tout doit
  passer par `src/lib/site.ts` ou par `VITE_SITE_URL`.
- **`.env` ne doit jamais être commité.** Il l'a été une fois, exposant une clé Google Maps :
  une clé navigateur reste visible côté client, mais sans restriction par référent, elle est
  facturable par n'importe qui.
- **Une variable `VITE_*` est publique par construction.** Dans le doute, elle va au §4.
