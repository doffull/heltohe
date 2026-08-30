# PROJECT — Helvetica MP

> **Document de reprise.** Tout ce qu'il faut savoir pour retravailler sur ce projet **sans
> relire le code** : ce qu'il fait, comment il est construit, les pièges qui coûtent cher,
> et la dette connue.
>
> Rédigé le 20/08/2026 par analyse du dépôt (`39e844c`), mis à jour le 28/08/2026 après le
> changement de dépôt (§16).
>
> ⚠️ **Le dépôt a changé le 28/08/2026** : le projet vit désormais dans
> `doffull/warltkfr`, recréé depuis Lovable. `gafsou20/Helvetica-MP` est une archive.
> Lire le §16 AVANT toute chose : il explique ce qui a été perdu, repris, et ce qui
> reste à vérifier.

---

## 1. Le projet en une phrase

Boutique e-commerce **techwear** (React/Vite + Supabase) livrée avec un **back-office de 46
pages** qui permet de tout piloter sans toucher au code : catalogue, stock multi-emplacements,
commandes, expéditions Colissimo, paiements, CRM, fidélité, SEO — et un **éditeur de design**
qui reconstruit les pages publiques depuis la base.

**C'est un produit administrable, pas un site vitrine.** La majorité du code (2,1 Mo de
composants, 1,6 Mo de pages) sert le back-office, pas la boutique.

| | |
|---|---|
| Origine | projet **Lovable**, synchronisé avec ce dépôt. Projet Supabase : `hzjzqdlyehclnpeqkier` (cf. §16, ⚠️ à confirmer) |
| Volume | **88 200 lignes** TS/TSX · 412 fichiers · 205 composants · 52 hooks |
| Back | Supabase : **66 tables**, 7 vues, 21 RPC, **165 migrations**, **30 edge functions** |
| Front | 23 routes déclarées, dont `/admin/*` (46 pages) et `/compte/*` |
| Branches | `main` uniquement · 2 commits |

⚠️ **Le projet s'appelait `LVTK6`.** Le renommage en Helvetica MP n'est pas terminé : les clés
`localStorage` et les événements DOM sont tous préfixés **`lvtk:`** (`lvtk:demoMode`,
`lvtk:open-roulette`, `lvtk:sess`…), et les numéros de commande sont préfixés `HMP-`. Ne pas
renommer les clés `lvtk:` sans migration — ça déconnecte les sessions et les paniers en cours.

---

## 2. Stack et topologie

```
   Navigateur                          Supabase (hzjzqdlyehclnpeqkier)
   ┌─────────────────┐                 ┌──────────────────────────────────┐
   │ React 18 + Vite │──── SDK JS ────►│ PostgreSQL + RLS                 │
   │ TS · Tailwind   │                 │  66 tables · 21 RPC · 165 migr.  │
   │ shadcn/Radix    │                 ├──────────────────────────────────┤
   │ TanStack Query  │──── invoke ────►│ 30 Edge Functions (Deno)         │
   └─────────────────┘                 └───────┬──────────────────────────┘
                                               │
        ┌──────────────────────────────────────┼───────────────────────────┐
        ▼                ▼                     ▼               ▼           ▼
   PayPal / PayPlug   Colissimo          AI Gateway        Resend      WooCommerce
   (paiement)         (étiquettes,       Lovable           Brevo       (import
                       points relais)    (Gemini/GPT)      (emails)     catalogue)
```

**Dépendances notables** : TanStack Query (tout le cache serveur), react-router-dom,
framer-motion, dnd-kit (drag & drop de l'éditeur), leaflet (carte des boutiques), recharts
(stats admin), pdf-lib + pdfjs-dist (étiquettes et import PDF), xlsx + papaparse (imports
catalogue), zod + react-hook-form.

---

## 3. À savoir avant de toucher au code

1. **Les prix ne sont JAMAIS calculés côté client.** Le panier affiche des montants, mais la
   commande passe par la RPC `validate_and_create_order` qui **relit les prix en base**,
   revalide le code promo et recalcule le total. Idem côté PayPal/PayPlug. Ne jamais
   « optimiser » en envoyant les prix depuis le front (§5).
2. **La configuration vit en base, pas dans le code.** Design, blocs de la home, footer,
   popups, roulette, méthodes de paiement, SEO : tout est en base et éditable depuis `/admin`.
   Modifier un composant sans regarder la table de config associée donne un résultat écrasé au
   prochain rendu.
3. **21 edge functions sur 30 sont publiques** (`verify_jwt = false`), dont des fonctions IA
   coûteuses. C'est volontaire (chatbot, essayage virtuel, recommandation de taille sur pages
   publiques) mais **c'est le principal risque d'abus et de facture** (§9).
4. **Les statuts de commande sont normalisés par un trigger** (`normalize_order_statuses` →
   `initcap`) : en base, c'est `Pending` / `Processing` / `Shipped` / `Delivered` / `Cancelled`,
   **avec majuscule**. Comparer à `'pending'` en minuscule ne matche rien.
5. **Trois lockfiles coexistent** — `bun.lock`, `bun.lockb`, `package-lock.json`. Le projet est
   développé sous **bun** (`build:protected` utilise `bun run`). Voir la dette, §14.
6. **Le stock n'est pas un simple entier sur le produit** : `inventory` → `stock_levels` par
   `location`, et `disponible = quantity - reserved` sommé sur tous les emplacements (§7).

---

## 4. Modèle de données

66 tables. Les familles utiles à connaître :

| Domaine | Tables |
|---|---|
| **Catalogue** | `products`, `categories`, `product_category_order`, `product_styles`, `product_looks`, `product_reviews`, `product_review_votes` |
| **Stock** | `inventory`, `stock_levels`, `stock_history`, `stock_transfers`, `locations`, `boutiques` |
| **Commande** | `orders`, `cart_items`, `order_preparations`, `promo_codes`, `cgv_consents`, `customers`, `addresses`, `wishlists` |
| **Paiement** | `payment_gateway_secrets`, `paypal_config`, `paypal_transactions`, `paypal_webhook_events`, `payplug_transactions`, `checkout_config` |
| **Expédition** | `colissimo_bordereaux` |
| **Fidélité** | `loyalty_transactions`, `loyalty_rewards` (+ `customers.loyalty_points` / `loyalty_tier`) |
| **Design / CMS** | `design_settings`, `pages`, `page_templates`, `banners`, `banner_analytics`, `category_hero_settings`, `home_fab_buttons` |
| **Marketing** | `newsletters`, `newsletter_popups`, `newsletter_popup_views`, `popup_campaigns`, `popup_events`, `roulette_config`, `roulette_segments`, `roulette_spins` |
| **CRM / support** | `crm_contacts`, `crm_conversations`, `crm_messages`, `crm_message_templates`, `messages`, `messaging_config`, `chat_logs`, `bot_config` |
| **Analytics** | `visitor_sessions`, `page_views`, `click_events`, `client_error_logs` |
| **Sécurité** | `user_roles`, `role_audit_log`, `admin_access_log`, `admin_config` |
| **Divers** | `mannequins`, `tryon_looks`, `seo_redirects`, `wp_sync_logs`, `notification_config`, `notification_log` |

### Les vues `*_public` — à comprendre avant de créer une table de config

`bot_config_public`, `checkout_config_public`, `design_settings_public`, `paypal_config_public`,
`roulette_config_public`, `roulette_segments_public`.

**Le motif** : une table de config contient à la fois des réglages publics (couleurs, libellés,
segments de la roulette) et des secrets (clés API, quotas). La table est fermée par RLS, et une
**vue `_public` expose uniquement les colonnes non sensibles** aux visiteurs anonymes. Toute
nouvelle table de config doit suivre ce motif — sinon soit le front casse, soit un secret fuit.

### Les 21 RPC (la logique métier réellement fiable)

```
validate_and_create_order   ← LE point d'entrée commande : revalide prix + promo, crée la commande
reserve_order_stock / release_order_stock / consume_order_stock   ← cycle de vie du stock
preview_promo_code          ← simulation d'un code promo sans l'appliquer
award_loyalty_points · redeem_loyalty_reward
spin_roulette               ← tirage côté serveur (le client ne décide pas du lot)
submit_product_review · can_user_review_product · moderate_review · vote_review_helpful
              · get_product_review_stats
has_role · list_users_by_role · find_user_by_email · security_audit_snapshot
record_cgv_consent · track_session_heartbeat · mark_popup_converted · get_newsletter_stats
```

Règle générale : **tout ce qui a une valeur (argent, stock, lot, points) est une RPC serveur**,
jamais un `INSERT` direct depuis le front.

---

## 5. Le tunnel de commande (le cœur métier)

`src/pages/Checkout.tsx` — trois étapes : **adresse → livraison → confirmation**.

**Livraison** : `home` (domicile) ou `relay` (point relais, défaut). Les points relais sont
cherchés via l'edge function `colissimo-proxy` à partir du code postal. Le tarif vient de
`checkout_config` (`shippingRelayPrice`, défaut 4,50 €).

**Création de la commande** — le point à ne pas casser :

```ts
supabase.rpc('validate_and_create_order', {
  p_items,          // { productId, quantity, size, color } — AUCUN prix envoyé
  p_promo_code,
  p_delivery_mode,
  p_order_data,     // identité + adresse
})
```

Le serveur relit les prix, revalide le promo, calcule le total et insère la commande. Le front
ne reçoit que le résultat (`result.items`, `result.subtotal`, `result.total`) — et c'est **ce
résultat**, pas les valeurs locales, qui part dans l'e-mail de confirmation.

**Numéro de commande** : `HMP-<timestamp base36>`, généré côté client puis passé au serveur.

**E-mail de confirmation** : `send-order-confirmation` (détail des 5 canaux d'envoi : §17),
en *fire and forget* — l'échec d'envoi
n'annule pas la commande. Conséquence : une commande peut exister sans e-mail parti, sans trace
visible. À garder en tête en cas de réclamation client.

---

## 6. Paiement

Trois chemins, tous serveur :

| Moyen | Fonction | Notes |
|---|---|---|
| **PayPal** | `paypal` + `paypal-webhook` | sandbox **et** live, webhooks tracés dans `paypal_webhook_events` |
| **PayPlug** | `payplug` | paiement hébergé + redirection ; retour détecté via `?payplug=` sur `/checkout` |
| **Sans paiement** | RPC directe | commande créée en `Pending`, validée à la main dans `/admin/orders` |

### ⚠️ Où vivent les identifiants — les deux passerelles ne suivent PAS la même règle

C'est **la** source de confusion du projet. Trois emplacements distincts :

| | PayPal | PayPlug |
|---|---|---|
| **Clé secrète** | **secrets Supabase** (`PAYPAL_{LIVE,SANDBOX}_CLIENT_SECRET`) | **base**, `payment_gateway_secrets.secret_key` |
| **Identifiant public** | **base** `paypal_config.client_id_{live,sandbox}`, repli `.env` | — |
| **Réglages** | **base** `paypal_config` (environnement, devise, `intent`, boutons, `webhook_id`) | **base** `checkout_config` |
| **Saisie** | secrets Supabase **+** `/admin/paypal` | `/admin/checkout` uniquement |

**Le secret PayPal n'est ni dans le `.env`, ni en base** : il est lu par `Deno.env.get()` dans
l'edge function. C'est pour ça que `/admin/paypal` ne le demande pas — la page ne peut pas le
stocker.

**Priorité du client ID PayPal** (`usePayPalConfig.ts` → `activeClientId`) :

```ts
const fromDb = environment === 'live' ? clientIdLive : clientIdSandbox;
return fromDb || (environment === 'live' ? '' : ENV_PAYPAL_CLIENT_ID);
```

La base gagne ; `VITE_PAYPAL_CLIENT_ID` n'est qu'un repli — **et uniquement en sandbox**.
⚠️ **En live, il n'y a aucun repli** : `client_id_live` vide en base ⇒ client ID `""` ⇒ le
bouton PayPal ne se charge pas, même avec la variable d'environnement renseignée.

`payment-keys` est la façade admin des clés en base ; passerelles prévues : `stripe`,
`payplug`, `mollie`, `klarna`, `paypal` — **seules PayPal et PayPlug sont implémentées**.

### Solidité du parcours PayPal (audit du 20/08/2026)

**Ce qui est bien fait** : le montant envoyé à PayPal vient de `validate_and_create_order`,
jamais du client ; les secrets ne quittent pas le serveur ; le remboursement est réservé aux
admins et borné au restant dû ; capture directe et webhook convergent vers le même
`payment_status: paid`, avec `sync-order` en filet manuel.

**Trois points à traiter avant une vraie mise en production :**

1. 🔴 **Le webhook est *fail-open*.** `paypal-webhook` traite l'événement si
   `verification === "SUCCESS" || !config?.webhook_id`. Or `paypal_config.webhook_id` est
   nullable et sans valeur par défaut : **s'il n'est pas renseigné dans `/admin/paypal`, la
   vérification de signature est purement sautée** et un `PAYMENT.CAPTURE.COMPLETED` forgé
   suffit à passer une commande en `paid`. Le comportement attendu serait l'inverse : pas de
   `webhook_id` ⇒ journaliser et refuser de traiter.
2. 🔴 **`paypal-webhook` n'est pas déclaré `verify_jwt = false`** dans `config.toml` (idem pour
   la branche notification de `payplug`). Au défaut Supabase (`true`), les appels de PayPal —
   qui n'ont pas de JWT Supabase — sont rejetés en 401 avant d'entrer dans la fonction : **le
   webhook ne se déclenche alors jamais**. À vérifier selon le mode de déploiement (le
   dashboard Lovable peut avoir un réglage propre que `config.toml` ne reflète pas).
   Diagnostic en dix secondes : si `paypal_webhook_events` est vide ou ne contient que des
   `UNVERIFIED`, c'est ce cas.
3. 🟠 **Le stock n'est jamais réservé au paiement.** `reserve_order_stock` n'est appelé que
   depuis `/admin/orders` et `/admin/payment-test` — deux clients peuvent donc payer le même
   dernier article (§7).

Secondaires : `create-order` est ouvert et sans limitation de débit (chaque appel insère une
commande **et** crée une commande PayPal) ; le montant capturé n'est jamais recomparé au total
de la commande ; le `.or()` du webhook interpole `paypalOrderId` brut dans un filtre PostgREST.

Admin : `/admin/paypal`, `/admin/checkout`, `/admin/payment-test`.

---

## 7. Stock, expédition, préparation

**Modèle à trois niveaux** — `inventory` (une ligne par variante produit) → `stock_levels` (une
ligne par emplacement) → `locations` / `boutiques`. Le **disponible** vaut
`quantity - reserved`, **sommé sur tous les emplacements** (`useProductStock.ts`).

**Cycle de vie** : `reserve_order_stock` à la commande → `consume_order_stock` **à
l'expédition** (déclenché depuis `/admin/orders`) → `release_order_stock` en cas d'annulation.
Le stock n'est donc **pas** décrémenté au paiement.

**Colissimo** : `colissimo-proxy` (recherche de points relais) et `create-colissimo-label`
(génération d'étiquette — la réponse est un `multipart/related` dont il faut **extraire les
octets PDF à la main**, en cherchant le marqueur `%PDF`). Les bordereaux sont suivis dans
`colissimo_bordereaux`, impression via `/admin/bordereau/:id`.

**Import catalogue** : PDF (`parse-products-pdf`, `parse-stock-pdf`, via IA), CSV/XLSX
(`csvProductMapper`, `csvProductValidator`), et **WooCommerce** (`woocommerce-import`, logs dans
`wp_sync_logs`, pages `/admin/woocommerce` et `/admin/woocommerce-logs`).

⚠️ `woocommerce-import` renvoie **HTTP 200 même en erreur**, avec `{ error, fallback: true }`
dans le corps. Tester le contenu de la réponse, pas le code HTTP.

---

## 8. Rôles et sécurité

**Cinq rôles** (`user_roles`, jamais un champ sur le profil — c'est ce qui rend l'élévation de
privilège impossible côté client) :

| Rôle | Périmètre |
|---|---|
| `admin` | tout |
| `stock_manager` | stock, inventaire, transferts |
| `preparator` | préparation et expédition des commandes |
| `auditor` | lecture / audit |
| `order_validator` | validation des commandes |

`hasAdminPanelAccess` = au moins un de ces rôles. Toute modification de rôle est tracée dans
`role_audit_log` ; l'attribution se fait depuis `/admin/roles`, sans SQL.

⚠️ **Piège corrigé, à ne pas réintroduire** : `AuthContext` n'arrête son état de chargement
qu'une fois **la session restaurée ET les rôles chargés** (`sessionChecked && rolesLoaded`).
Sans cette double condition, `/admin` redirige vers `/` pendant la course entre les deux — le
bug se manifeste par une déconnexion apparente au rafraîchissement.

Autres éléments : `hibp_enabled` sur les mots de passe (min. 6 caractères), journalisation des
accès admin (`admin_access_log`), consentement CGV horodaté (`record_cgv_consent`),
`security_audit_snapshot` alimentant `/admin/security` et `/admin/audit`.

---

## 9. L'IA (Gemini / GPT via la passerelle Lovable)

**Il n'y a pas de clé OpenAI ni Google dans le projet.** Tout passe par
`https://ai.gateway.lovable.dev/v1/chat/completions` avec `LOVABLE_API_KEY`, en protocole
compatible OpenAI. Helper commun : `supabase/functions/_shared/gemini.ts` (nom historique,
`callGemini`) et `_shared/ai-extraction.ts`.

**Modèle par défaut** : `google/gemini-2.5-flash`. Également utilisés : `openai/gpt-5-mini`
(5 fonctions), `openai/gpt-image-2`, `google/gemini-3.6-flash`,
`google/gemini-3.1-flash-image`, `google/gemini-2.5-flash-image`.

**Ce que l'IA fait ici** — c'est une part importante du produit :

| Fonction | Rôle |
|---|---|
| `analyze-product-image` · `generate-product-description` · `product-ai-helpers` | fiches produit assistées |
| `parse-products-pdf` · `parse-stock-pdf` | import catalogue/stock depuis des PDF fournisseur |
| `virtual-tryon` · `image-pose-edit` · `recommend-size` | essayage virtuel et conseil de taille |
| `generate-product-video` · `generate-slide-image` · `generate-slide-text` · `generate-cta-style` · `template-from-mockup` | génération de contenu marketing |
| `contact-chat` · `voice-command` | chatbot support et commande vocale |
| `verify-customer-info` | contrôle des coordonnées client |

⚠️ **La quasi-totalité de ces fonctions est publique** (`verify_jwt = false`). Un visiteur non
authentifié peut donc déclencher des appels IA. C'est nécessaire au parcours visiteur, mais
**il n'y a pas de limitation de débit visible** : c'est le premier endroit à regarder en cas de
facture anormale.

---

## 10. Le back-office (46 pages)

| Famille | Pages |
|---|---|
| **Catalogue** | Products, ProductBadges, Stock, Media, MediaAudit, PdfExtract, Reviews, Mannequins |
| **Ventes** | Orders, Preparations, Colissimo, Customers, Checkout, PayPal, PaymentTest |
| **Design / CMS** | Design, Pages, PageTemplates, Footer, TopBanner, HomeIcons, FeedSections, Transitions, Popups, Roulette |
| **Marketing** | Marketing, BannersAnalytics, Notifications, Messagerie, Chatbot, Collab, Live |
| **Technique** | Settings, Security, Roles, Audit, ErrorLogs, Seo, SeoRedirects, WooCommerce, WooCommerceLogs, AgentIntegrations, Boutiques |

Les trois plus gros fichiers du dépôt sont ici : `AdminStock.tsx` (3 136 l.),
`AdminDesign.tsx` (2 915 l.), `ProductForm.tsx` (1 921 l.). **Toute refonte doit commencer
par là** — ce sont les fichiers où une modification a le plus de chances de casser autre chose.

`AdminDesign` + `PageBuilder` + `page_templates` forment un **éditeur de pages** (drag & drop
dnd-kit, autosave `useDesignAutosave`, historique `useDesignHistory`) : les pages publiques
sont reconstruites depuis la base. C'est le sous-système le plus complexe du projet.

---

## 11. Design system

Style **techwear / HUD** : classes maison `chamfer-hud`, `chamfer-hud-sm`, `chamfer-hud-lg`,
`hud-text` (angles biseautés, esthétique interface militaire), palette `hmp` dans
`tailwind.config.ts`, variables CSS HSL (`--step-confirm`, etc.) dans `src/index.css`.

Base **shadcn/ui + Radix** (`components.json`), animations framer-motion.

**Mode démo** (`useDemoMode`) : quand il est actif, les popups réapparaissent à chaque visite,
la sidebar reste ouverte et la roulette s'ouvre automatiquement. Source de vérité
`design_settings.demoMode`, avec surcharge locale `localStorage['lvtk:demoMode'] = '1'`.
**À vérifier en premier si le comportement diffère entre deux machines.**

---

## 12. Build, protection du code, déploiement

```bash
bun install
bun run dev              # Vite, port 8080
bun run build            # build standard
bun run build:protected  # PROTECT=1 → build OBFUSQUÉ, pour livraison à un tiers
bun run test             # vitest
bun run lint
```

**Deux verrous pour la livraison à un tiers** — spécifiques à ce projet :

1. **Obfuscation** (`vite.config.ts`, plugin `lvtk-protect`) : `javascript-obfuscator` avec
   control-flow flattening, string array en base64 et `selfDefending`, appliqué **uniquement si
   `PROTECT=1`**. Un build obfusqué est indébogable — ne jamais diagnostiquer un bug dessus.
2. **Verrou de domaine** (`src/lib/licenseGuard.ts`) : `VITE_LICENSE_DOMAINS` +
   `VITE_LICENSE_KEY`. Hors des domaines autorisés, l'app **refuse de démarrer**.
   Toujours autorisés : `localhost`, `127.0.0.1`, `*.lovable.app`, `*.lovableproject.com`,
   `*.lovable.dev`. **Si la liste est vide, le verrou est inactif** — un build « protégé » sans
   `VITE_LICENSE_DOMAINS` ne protège rien.

Déploiement : via Lovable (Share → Publish) ou n'importe quel hébergeur statique + Supabase.

---

## 13. Secrets

**Front** (`.env`, préfixe `VITE_`, publics par nature) : `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_*`, et pour un build protégé `VITE_LICENSE_DOMAINS` /
`VITE_LICENSE_KEY`.

**Edge functions** (secrets Supabase, jamais dans le dépôt) :

```
SUPABASE_SERVICE_ROLE_KEY · SUPABASE_ANON_KEY · SUPABASE_JWT_SECRET
LOVABLE_API_KEY            ← toute l'IA
RESEND_API_KEY · BREVO_API_KEY          ← e-mails
PAYPAL_LIVE_CLIENT_ID / _SECRET · PAYPAL_SANDBOX_CLIENT_ID / _SECRET
COLISSIMO_LOGIN · COLISSIMO_PASSWORD · LAPOSTE_API_KEY
GOOGLE_MAPS_API_KEY · TWILIO_API_KEY
```

⚠️ **`.env.example` ne documente que la partie front.** Les 16 secrets ci-dessus ne sont listés
nulle part dans le dépôt — c'est cette section qui en tient lieu. Les clés PayPlug/Stripe, elles,
sont **en base** (`payment_gateway_secrets`), pas en variables d'environnement (§6).

---

## 14. Dette connue et points d'attention

| Sévérité | Sujet | Détail |
|---|---|---|
| 🔴 | **Webhook PayPal *fail-open*** | `webhook_id` non renseigné ⇒ vérification de signature sautée ⇒ endpoint « marquer comme payé » non authentifié (§6) |
| 🔴 | **Webhooks probablement jamais reçus** | `paypal-webhook` et la branche notification de `payplug` ne sont pas en `verify_jwt = false` → 401 (§6) |
| 🔴 | **Aucun garde-fou sur les fonctions IA publiques** | 21 fonctions en `verify_jwt = false`, dont la génération d'images et de vidéos. Pas de rate limiting visible → risque de facture (§9) |
| 🟠 | **Survente possible** | le stock n'est réservé ni à la commande ni au paiement, seulement depuis `/admin/orders` (§6, §7) |
| 🟠 | **Tests quasi inexistants** | **4 fichiers de test** pour 88 200 lignes (`TechwearHero`, `ProductInfo`, `example`, `home-hero`). Aucune couverture du tunnel de commande, du stock ni des RPC |
| 🟠 | **Trois lockfiles** | `bun.lock` + `bun.lockb` + `package-lock.json` (878 Ko). Deux gestionnaires de paquets = builds divergents selon la machine. **À trancher : bun** |
| 🟠 | **Historique git inexploitable** | 2 commits « maj ». Aucun moyen de savoir pourquoi une décision a été prise — d'où ce document |
| 🟡 | **README = template Lovable** | `REPLACE_WITH_PROJECT_ID` encore en place, ne décrit pas le projet |
| 🟡 | **Renommage LVTK6 → HMP inachevé** | clés `lvtk:` en localStorage et événements DOM (§1) |
| 🟡 | **Accessibilité** | dialogs Radix sans `DialogTitle` / `aria-describedby` (warnings console) |
| 🟡 | **SEO** | jamais audité complètement (meta, H1, alt, JSON-LD, sitemap) |
| 🟢 | **20 warnings du linter Supabase** | RPC `SECURITY DEFINER` nécessaires au métier, policies `USING(true)` sur les tables de tracking public — acceptés |

### Reste à faire (repris de `AUDIT_REPORT.md`, 21/05/2026)

- [ ] Test e2e du tunnel de commande **avec des articles** (adresse → Colissimo → récap → paiement)
- [ ] Tests du compte client (inscription, profil, adresses, commandes, fidélité)
- [ ] Audit des 46 pages admin
- [ ] Audit des 30 edge functions (logs, erreurs, coûts)
- [ ] Audit SEO et a11y complets
- [ ] Rate limiting sur les fonctions IA publiques *(ajout de cette analyse)*
- [ ] Choisir un seul gestionnaire de paquets *(ajout de cette analyse)*

Trois bugs critiques ont été corrigés le 21/05/2026 et ne doivent pas réapparaître : garde
`if (!e.key)` dans `ImageProtection.tsx` (crash global sur touches IME/médias), délai
d'ouverture de la roulette à 8 000 ms, et policy RLS `UPDATE` anon sur `visitor_sessions`
(le tracking visiteur passe par un `INSERT` + heartbeat RPC, pas un `upsert`).

---

## 15. Repo

`github.com/doffull/warltkfr` — branche `main`, projet synchronisé avec Lovable
(`lovable.dev/projects/cfa7542a-a172-447c-89f5-aa0d494cb267`).

`github.com/gafsou20/Helvetica-MP` est l'ANCIEN dépôt, conservé en archive : il porte
l'historique de nos travaux du 19 au 26/08, qui n'existe nulle part ailleurs. Ne pas le
supprimer. Voir §16.

Fichiers de contexte à la racine : ce `PROJECT.md`, et `AUDIT_REPORT.md` (rapport d'audit du
21/05/2026, conservé pour ses constats de tests navigateur).

---

## 16. Changement de dépôt — 28/08/2026

Le projet a été **recréé depuis Lovable dans un nouveau dépôt**,
`doffull/warltkfr`, sans reprendre l'historique de `gafsou20/Helvetica-MP`.
Les deux dépôts n'ont **aucun ancêtre commun** : 12 commits d'un côté, 3 210 de
l'autre. Ce n'est pas un rebase raté, ce sont deux lignées distinctes.

### Ce que le nouveau dépôt apportait

Les chantiers du 24 au 27/08 : **suivi de colis en temps réel** (`tracking-key`,
`carrier-tracking-webhook`, `poll-carrier-tracking` + cron horaire, notifications
compte, carte admin), **e-mails d'authentification personnalisés** (hook Supabase
+ 6 gabarits React Email + écran `/admin/auth-emails`), **e-mails de changement de
statut de commande**, **pages légales éditables** (`LegalPageRenderer`), **gestion
des clés IA** (`ai-keys`), **badge « épuisé »** activable par produit, et
6 migrations.

### Ce qu'il avait écrasé, et qui a été repris

| Perdu | État |
|---|---|
| Correctif `colissimo-proxy` (points relais pour visiteurs non connectés) | ✅ réappliqué — le fichier était revenu **bit à bit** à la version d'avant le correctif |
| `src/lib/site.ts`, plugin Vite `siteUrlHtmlPlugin`, `scripts/generate-seo-files.mjs` | ✅ réappliqués |
| `PROJECT.md`, `variables.md`, `.env.example`, `.nvmrc` | ✅ restaurés et remis à jour |

`SeoHead.tsx` a été **fusionné**, pas écrasé : le dev l'avait enrichi entre-temps
(surcharge titre/description/image par page, `og:site_name`, composant `ProductSeo`
avec JSON-LD produit et avis). Tout son travail est conservé ; seule la constante
de domaine en dur a été remplacée par `@/lib/site`, dont `ProductSeo` bénéficie
désormais aussi.

### Le domaine : trois valeurs, dont une cassée

Le dépôt recréé portait `helvetica-mp.net` (SeoHead, index.html, sitemap, robots),
`helvetica-mp.**helvetica-mp.net**` (AdminSeo, VisualEditorPanel — manifestement
faux) et `helvetica-mp.com` (CGV, mentions légales, e-mails de contact). Les deux
premières sont nées du remplacement de l'import `@/lib/site` par des constantes
recopiées à la main.

**Le domaine de production est `helvetica-mp.com`** et tout repasse par
`src/lib/site.ts`. C'est exactement le genre de dérive que cette centralisation
existe pour empêcher : ne pas réintroduire de domaine en dur.

### ⚠️ Le projet Supabase — à confirmer

Le dépôt recréé pointait vers `bumfyrfmormisyjletpb`, l'ancien vers
`hzjzqdlyehclnpeqkier`. Décision : retour sur **`hzjzqdlyehclnpeqkier`**, valeur
portée par trois fichiers générés par la plateforme (`supabase/config.toml`,
`.lovable/mcp/manifest.json`, `supabase/functions/mcp/index.ts`).

**Cette doc affirmait pourtant l'inverse** (`bumfyrfmormisyjletpb`, §1 et §2 avant
correction) : la contradiction n'est pas tranchée par les fichiers. À vérifier dans
le dashboard Supabase — **le bon projet est celui qui contient les commandes
récentes**. Si c'est l'autre, un seul commit à inverser.

Conséquence directe : les **6 migrations du 24-27/08 n'ont jamais tourné** sur
`hzjzqdlyehclnpeqkier`. Elles s'appliqueront au prochain déploiement — dont celle
qui programme le cron de suivi de colis, qui embarquait en dur l'URL **et la clé
anon** de l'autre projet. La clé est remplacée par `__ANON_KEY__` et un garde-fou
SQL fait échouer le déploiement tant qu'elle n'est pas renseignée : un échec
bruyant vaut mieux qu'un cron silencieusement rejeté en 401.

### `.env` versionné

Le `.gitignore` du dépôt recréé était revenu au modèle Lovable par défaut, qui
n'exclut pas `.env`. URL et clés Supabase, ainsi qu'une **clé Google Maps
navigateur**, se sont retrouvées dans un dépôt public. Le `.gitignore` du projet
est rétabli et `.env` sorti du suivi, mais **l'historique les conserve** : la clé
Maps doit être restreinte par référent HTTP, ou remplacée.

### Tests

`npm test` : **10 échecs sur 11**, déjà présents sur le commit livré par le dev
(`2cafa2d3`) — vérifié en rejouant la suite sur la base non modifiée. Rien à voir
avec la reprise, mais la suite ne sert pour l'instant à rien comme garde-fou.

---

## 17. Envoi d'e-mails — 5 méthodes, 3 transports

**Aucun SMTP nulle part** : tout part en HTTPS via des API REST. Les edge functions tournent
sur Deno et ne parlent jamais SMTP — ce sont Resend et Brevo qui remettent les messages.

⚠️ Piège de lecture : l'URL `…/brevo/smtp/email` est le nom d'un **endpoint REST** de Brevo
(leur API historique s'appelait « SMTP API »), pas une connexion SMTP.

| # | Fonction | Circonstance | Transport | Expéditeur |
|---|---|---|---|---|
| 1 | `send-order-confirmation` | commande passée · paiement reçu · renvoi manuel (`emailType`) + copie admin | **Resend direct** `api.resend.com` | `MAIL_FROM` ✅ |
| 2 | `send-order-status-email` | statut : payée · expédiée (exige un n° de suivi) · mise à jour de suivi | **Resend direct** | `MAIL_FROM` ✅ |
| 3 | `send-order-notification` | réservation de stock · préparation assignée · rôle attribué · gabarits de `notification_config` | **Resend direct** | `MAIL_FROM` ✅ |
| 4 | `crm-send-message` | message CRM envoyé à la main depuis le back-office | **Resend direct**, ou Brevo via passerelle (`messaging_config.provider`) | `messaging_config.default_from_email`, à défaut `MAIL_FROM` |
| 5 | `auth-email-hook` | inscription · mot de passe oublié · magic link · changement d'e-mail · invitation · réauthentification | **Resend direct**, gabarits React Email | `MAIL_FROM` ✅ |

### L'expéditeur est centralisé (30/08/2026)

`supabase/functions/_shared/mailer.ts` est le **seul** endroit où un expéditeur est défini.
Il lit trois secrets Edge Functions et expose `sendMail()` :

| Secret | Rôle | Absent ? |
|---|---|---|
| `MAIL_FROM` | adresse d'expédition | repli `onboarding@resend.dev` + `console.warn` |
| `MAIL_FROM_NAME` | nom affiché | repli `HELVETICA-MP` |
| `MAIL_REPLY_TO` | adresse de réponse | repli sur `MAIL_FROM` |

⚠️ **Le domaine de `MAIL_FROM` doit être vérifié dans Resend** (SPF + DKIM), sinon l'envoi
est refusé. Le domaine de `MAIL_REPLY_TO` n'a rien à prouver : c'est une boîte de réception.
Le sous-domaine retenu est `site.helvetica-mp.com` — le domaine racine porte déjà la
messagerie pro (MX `mail.helvetica-mp.com`, SPF `spf.jabatus.fr`), on isole la réputation
du transactionnel.

Ne jamais réécrire un `from:` en dur dans une fonction : passer par `sendMail()`, qui pose
aussi le `reply_to` — absent de tout le projet avant cette date, un client qui répondait à
sa confirmation de commande écrivait dans le vide.

### Un seul chemin vers Resend

Les 4 fonctions attaquent **`api.resend.com` en direct** : `RESEND_API_KEY` suffit, plus
aucune dépendance à `LOVABLE_API_KEY` côté e-mail. Seuls subsistent sur la passerelle
Lovable le SMS Twilio et le canal Brevo du CRM.

> Historique : jusqu'au 30/08/2026, `send-order-notification` et le CRM passaient par
> `connector-gateway.lovable.dev` et exigeaient **les deux** clés. Si `LOVABLE_API_KEY`
> manquait, l'envoi échouait **silencieusement**. Ce piège n'existe plus.

### `auth-email-hook` — le hook doit être activé à la main

Réécrit le 30/08/2026 : il vérifiait une signature *Lovable* (`LOVABLE_API_KEY`) et empilait
dans la queue `auth_emails` dépilée par l'infra Lovable. Il vérifie désormais la signature
**Standard Webhooks** de Supabase (`SEND_EMAIL_HOOK_SECRET`) et envoie par `sendMail()`.

⚠️ **Il ne s'exécute que si le hook est activé** dans *Authentication → Hooks → Send Email
Hook*. Au 30/08/2026 il ne l'est pas : les e-mails d'authentification partent donc avec les
gabarits Supabase par défaut, via son SMTP intégré **plafonné à quelques envois/heure**.
Les gabarits de `/admin/emails-auth` ne sont lus par personne tant que le hook est éteint.

Deux pièges pour qui rebranche ça :
1. **Supabase ne transmet pas d'URL de confirmation**, seulement un `token_hash`. La
   fonction reconstruit `…/auth/v1/verify?token=…&type=…&redirect_to=…`. Une erreur ici
   n'échoue pas l'envoi : elle produit des liens morts.
2. **Le changement d'adresse émet deux messages** (`email_change_current` et
   `email_change_new`) si « Secure email change » est actif. Le second vise `new_email`
   avec le jeton `token_hash_new`.

Désactiver le hook rend la main à Supabase instantanément — c'est le retour arrière.

### Dette restante

`messaging_config.provider` ne pilote toujours que le CRM ; les autres fonctions sont
Resend en dur.

⚠️ **`notify.helvetica-mp.com` n'existe pas en DNS** (constaté le 30/08/2026). C'était le
`SENDER_DOMAIN` de l'ancien hook ; la valeur a disparu du code mais reste à nettoyer côté
Resend si elle y figure.

### Et si on voulait du SMTP ?

C'est possible depuis les edge functions (`denomailer`, exemple officiel Supabase), mais
**les ports sont restreints** : 25 et 587 sont bloqués, 465 en TLS fonctionne, 2587 est
recommandé (AWS SES). Vérifier le port du serveur SMTP visé **avant** de s'engager. À
peser : plus de reprise automatique, plus de retour de bounces, latence du handshake TLS
dans le chemin d'une commande, et réputation d'IP à construire.
