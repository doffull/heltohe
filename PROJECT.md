# PROJECT — Helvetica MP

> **Document de reprise.** Tout ce qu'il faut savoir pour retravailler sur ce projet **sans
> relire le code** : ce qu'il fait, comment il est construit, les pièges qui coûtent cher,
> et la dette connue.
>
> Rédigé le 20/08/2026 par analyse du dépôt (`39e844c`), mis à jour le 28/08/2026 après le
> changement de dépôt (§16), le 30/08/2026 après la première confrontation au projet
> Supabase réel (§17, §18), le 10/09/2026 après trois jours d'assainissement de
> l'infrastructure (§24), le 14/09/2026 après l'ouverture des expéditions hors
> France (§27), puis le 15/09/2026 après la remise en service des webhooks de
> paiement (§28), et le 16/09/2026 après la correction de la CN23 hors France
> et le passage des étiquettes au format A4 (§27.8).
>
> ⚠️ **Le dépôt a changé le 28/08/2026** : le projet vit désormais dans
> `doffull/warltkfr`, recréé depuis Lovable. `gafsou20/Helvetica-MP` est une archive.
> Lire le §16 AVANT toute chose : il explique ce qui a été perdu, repris, et ce qui
> reste à vérifier.
>
> ⚠️ **Le dépôt n'est pas le déploiement.** Le 30/08/2026, 6 edge functions sur 36
> n'avaient jamais été mises en ligne et le registre des migrations distant était vide.
> Avant de conclure qu'une fonctionnalité « existe », vérifier qu'elle est déployée : §18.
> Le 08/09/2026 encore, la fonction de commande en ligne s'est révélée être une version
> antérieure à celle du dépôt — constaté sur une vraie commande, pas sur le code (§24.2).
>
> ⚠️ **Les migrations ont été remises à plat le 09/09/2026.** Un baseline unique remplace
> les 188 fichiers, désormais dans `supabase/migrations/_archive/`. `supabase db push`
> refonctionne. Lire le §24.4 avant d'y toucher.
>
> ⚠️ **Un réglage correct dans `config.toml` ne dit rien de la production.**
> Les trois webhooks appelés par des tiers (`payplug`, `paypal-webhook`,
> `carrier-tracking-webhook`) déclaraient `verify_jwt = false` depuis toujours
> et étaient pourtant rejetés en 401 côté Supabase — donc inopérants. Le test
> qui le révèle est au §28.1, à relancer après chaque redéploiement.
>
> ⚠️ **Une seule fonction fabrique les étiquettes Colissimo :
> `create-colissimo-label`.** Elle ne prend qu'un `order_id` et relit la commande
> en base. L'action `generateLabel` de `colissimo-proxy` est **dépréciée** — elle
> recevait l'adresse recopiée par l'appelant, et aucun des cinq appelants ne
> transmettait le pays. Ne jamais y revenir : §27.5.
>
> ⚠️ **Les étiquettes sortent en A4** (`PDF_A4_300dpi`) depuis le 16/09/2026, pour
> TOUTES les destinations : la planche avec l'étiquette à gauche et la notice de
> découpage à droite. C'est un format **bureautique** — il ne s'imprime pas sur la
> thermique 10×15. France et UE : 1 page. Hors UE et DOM-TOM : 5 pages (+ CN23).
> Voir §27.8.
>
> ⚠️ **Sur une CN23, `totalAmount` est le PORT, pas le total de la commande.**
> Colissimo l'imprime sous « Frais de port » et la douane calcule ses droits sur
> marchandise + port. Y mettre le total faisait payer le destinataire sur près du
> double de la valeur réelle : §27.8.
>
> ⚠️ **Les prix sont TTC.** `orders.tax` est la TVA *contenue* dans le total, jamais un
> supplément : ne jamais l'additionner. Un écran d'admin le faisait (§24.8), un autre le
> fait encore à l'enregistrement (§24.1).

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
| Origine | projet **Lovable**, synchronisé avec ce dépôt. Projet Supabase : `hzjzqdlyehclnpeqkier` — **confirmé le 30/08/2026** (§16) |
| Volume | **88 200 lignes** TS/TSX · 412 fichiers · 205 composants · 52 hooks |
| Back | Supabase : **66 tables**, 7 vues, 21 RPC, **171 migrations**, **36 edge functions** (dont 5 non déployées, §18) |
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

### ✅ Le projet Supabase — tranché le 30/08/2026

Le dépôt recréé pointait vers `bumfyrfmormisyjletpb`, l'ancien vers
`hzjzqdlyehclnpeqkier`. Décision retenue : **`hzjzqdlyehclnpeqkier`**, valeur portée par
`supabase/config.toml`, `.lovable/mcp/manifest.json` et `supabase/functions/mcp/index.ts`.

**C'est confirmé.** Un `db push` lancé sur ce projet s'est arrêté sur la toute première
migration avec `ERROR: type "app_role" already exists`. Autrement dit le schéma y est
complet : c'est bien la base du site. La preuve est venue d'un échec, mais elle vaut.

Le lien se fait avec un jeton personnel (`SUPABASE_ACCESS_TOKEN`, ou `supabase login`) :

```bash
npx supabase link --project-ref hzjzqdlyehclnpeqkier
```

⚠️ **La clé anon du `.env` versionné est refusée** par l'API (`Invalid API key`) —
constaté le 30/08/2026. Elle appartient probablement à `bumfyrfmormisyjletpb` ou a été
révoquée. Toute sonde REST montée avec cette valeur échouera en 401 sans que la table
soit en cause.

### ⚠️ Le registre des migrations était vide — et ce qu'on en a fait

Au 30/08/2026, `migration list --linked` affichait **171 migrations locales, zéro côté
distant**, alors que le schéma était complet. Signature d'un projet piloté par Lovable :
la plateforme applique le SQL directement sans écrire dans
`supabase_migrations.schema_migrations`.

Le registre a été réparé **sans exécuter aucun SQL** :

```bash
npx supabase migration repair --status applied $(ls supabase/migrations | sed 's/_.*//' | tr '\n' ' ')
```

`db push --dry-run` répond désormais `Remote database is up to date.`

🔴 **Le point ouvert qu'il faut connaître.** Le §16 affirmait que les 6 migrations du
24-27/08 n'avaient jamais tourné sur ce projet. Elles viennent d'être marquées
« appliquées » avec toutes les autres : **si elles n'avaient effectivement pas tourné,
elles ne s'appliqueront jamais.** Sont concernées :

| Migration | Crée | Qui s'en sert |
|---|---|---|
| `20260827100317` | `customer_email_log` | `send-order-status-email` (insert non vérifié → échec muet) |
| `20260827131015` | `auth_email_templates` | `auth-email-hook` (dans un `try/catch` → repli silencieux sur le gabarit livré) |
| `20260827140407` | `order_tracking_events` + `cron.schedule` | suivi de colis |
| `20260824112441` | vue `design_settings_public` | front public |

Les deux premières sont lues dans du code tolérant aux erreurs : **leur absence ne se
voit pas**. À vérifier explicitement :

```bash
npx supabase inspect db table-record-counts --linked | grep -E "customer_email_log|auth_email_templates|order_tracking_events"
```

Si une table manque, rejouer **uniquement** son fichier via le SQL Editor du dashboard —
surtout pas un `db push` global.

*(Note : la migration du cron de suivi embarquait en dur l'URL et la clé anon de l'autre
projet. La clé est remplacée par `__ANON_KEY__` et un garde-fou SQL fait échouer le
déploiement tant qu'elle n'est pas renseignée : un échec bruyant vaut mieux qu'un cron
rejeté en 401.)*

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

---

## 18. Ce qui tourne vraiment — l'écart dépôt / déploiement

> État constaté le 30/08/2026, premier alignement du projet Supabase avec le dépôt.
>
> ⚠️ **Périmé depuis le 02/09** : les 45 edge functions sont déployées, dont les
> 4 données ici pour absentes (`poll-carrier-tracking`, `carrier-tracking-webhook`,
> `tracking-key`, `ai-keys`). Le tableau ci-dessous vaut comme historique, pas
> comme état courant. Voir §20.

Le dépôt contient **36 edge functions**. Le projet Supabase n'en servait que **30**, toutes
figées à la **version 14 du 21/08** (sauf `colissimo-proxy`, v15 du 26/08). Le dev
travaillait vraisemblablement sur un autre projet Supabase.

**Lire le dépôt ne dit pas ce qui est en ligne.** Le contrôle :

```bash
npx supabase functions list      # comparer UPDATED_AT au dernier commit touchant la fonction
```

### Les 6 qui n'avaient jamais été déployées

| Fonction | Ce que son absence impliquait | Au 30/08 |
|---|---|---|
| `send-order-status-email` | 🔴 aucun e-mail « payée / expédiée / suivi » n'a jamais été envoyé | ✅ déployée |
| `auth-email-hook` | gabarits d'authentification inutilisables | ✅ déployée et branchée |
| `poll-carrier-tracking` | le cron de suivi n'a rien à appeler | ❌ toujours absente |
| `carrier-tracking-webhook` | les statuts transporteur entrants tombent dans le vide | ❌ toujours absente |
| `tracking-key` | l'admin ne peut pas gérer la clé de suivi La Poste | ❌ toujours absente |
| `ai-keys` | gestion des clés IA absente | ❌ toujours absente |

**Le suivi de colis n'a jamais fonctionné** : 3 des 4 fonctions du domaine ne sont pas en
ligne, et les clés La Poste ne sont pas configurées. Ce qui est décrit ailleurs dans cette
doc décrit le *code*, pas un service rendu.

### Secrets réellement configurés

`supabase secrets list` au 30/08/2026 :

**Présents** — `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME`, `MAIL_REPLY_TO`,
`SEND_EMAIL_HOOK_SECRET`, `COLISSIMO_LOGIN`/`_PASSWORD`, les 4 `PAYPAL_*`, et les
`SUPABASE_*` injectés par la plateforme.

**Absents** :

| Secret | Conséquence |
|---|---|
| `LOVABLE_API_KEY` | plus aucune, côté e-mail (tout est passé en Resend direct, §17) |
| `GEMINI_API_KEY` | 🔴 **avec le précédent : toute l'IA est morte** — chatbot, essayage virtuel, reco de taille, générations |
| `LAPOSTE_API_KEY` | recherche de points relais |
| `LAPOSTE_TRACKING_API_KEY` | suivi de colis (repli possible en base, §5) |
| `CARRIER_WEBHOOK_TOKEN` | webhook transporteur (repli possible en base, §5) |
| `BREVO_API_KEY` · `TWILIO_API_KEY` · `GOOGLE_MAPS_API_KEY` | second canal e-mail · SMS · géocodage serveur |

⚠️ **Nuance sur l'IA** : `_shared/gemini.ts` sait basculer sur Gemini en direct, via
`GEMINI_API_KEY` ou la ligne `gemini_api` de `payment_gateway_secrets` (Admin → Chatbot).
Une seule clé Google ranimerait donc les fonctions texte et vision. Mais **7 fonctions
appellent `ai.gateway.lovable.dev` en dur** et resteront mortes sans réécriture :
`virtual-tryon`, `image-pose-edit`, `generate-product-video`, `generate-slide-image`,
`parse-products-pdf`, `template-from-mockup`, `ai-keys`.

### Hook d'authentification : activé

Créé le 30/08/2026, en mode HTTPS vers
`https://hzjzqdlyehclnpeqkier.supabase.co/functions/v1/auth-email-hook`, secret
`SEND_EMAIL_HOOK_SECRET` posé. Testé sur une inscription réelle : e-mail reçu, lien de
confirmation fonctionnel.

Avant ce jour, les e-mails d'authentification partaient avec les gabarits Supabase par
défaut, via son SMTP intégré **plafonné à quelques envois par heure**.

### Reste à faire, par ordre d'impact

1. **Déployer les 4 fonctions manquantes** et configurer les clés La Poste → remettre le
   suivi de colis en service
2. **Vérifier les 4 tables des migrations du 24-27/08** (§16) — leur absence est
   silencieuse
3. **Une clé Gemini** → ranimer la majorité de l'IA ; décider du sort des 7 fonctions
   liées en dur à la passerelle Lovable
4. **Vérifier `Site URL` et `Redirect URLs`** dans la configuration Auth : une URL non
   listée est ignorée, l'utilisateur retombe sur l'accueil après confirmation
5. **Remplacer la clé anon du `.env`**, refusée par l'API

---

## 19. Retour à Resend — 02/09/2026

Le mailer est repassé de **SMTP o2switch à Resend**. Décision produit : on
revient au transport que nous avions mis en place le 30/08 (§17).

### Ce qui s'était passé

Entre le 30/08 et le 01/09, Lovable a **réécrit `_shared/mailer.ts`** pour
envoyer via SMTP direct (`denomailer`, o2switch, port 465). L'API publique du
module a été conservée à l'identique — nos cinq exports, mêmes noms, mêmes
signatures — si bien qu'aucune des fonctions appelantes n'a eu à changer et que
la bascule est passée inaperçue. Seul le corps de `sendMail()` avait changé.

### Ce qui a été fait

- **`_shared/mailer.ts`** : corps de `sendMail()` réécrit vers `api.resend.com`.
  Les ajouts de Lovable sont **conservés** — `text?`, `headers?`, `htmlToText()`,
  `adminEmailAddress()`, `explainSendFailure()` — parce que `newsletter-campaign`,
  `admin-team`, `send-order-confirmation` et `send-custom-email` en dépendent
  désormais. Un revert brut du fichier les aurait cassées.
- **7 gardes `SMTP_HOST`** dans `send-order-confirmation`,
  `send-order-notification` et `send-order-status-email` : elles refusaient
  l'envoi **avant** d'appeler `sendMail()`. Sans ce remplacement par
  `RESEND_API_KEY`, la bascule n'aurait rien changé pour ces trois fonctions.
  `SMTP_READY` renommée `MAIL_READY`.
- **`explainSendFailure()`** réécrite pour les codes Resend (401/403 → domaine
  non vérifié, 422 → adresse invalide, 429 → débit, 0 → réseau).
- **`newsletter-campaign`** : pause portée de 300 ms à **600 ms**. Resend
  plafonne à 2 requêtes/seconde ; à 300 ms on frôlait la limite, et un `429`
  ici fait échouer un abonné **définitivement** — la boucle ne réessaie pas.
- Commentaires obsolètes corrigés dans 5 fichiers.

### ⚠️ Plus aucune variable `SMTP_*` n'est lue

Ni dans les edge functions, ni dans le front. Les secrets `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` peuvent être supprimés de
Supabase. `ADMIN_EMAIL`, elle, **reste nécessaire** : elle n'a rien à voir avec
le transport (destinataire des alertes internes, repli sur `MAIL_FROM`).

### Le repli `onboarding@resend.dev`, rétabli

`mailFromAddress()` retombe sur le domaine de test de Resend quand `MAIL_FROM`
est absente, avec un avertissement en logs émis une seule fois. C'était notre
design d'origine et `variables.md` le documentait déjà. ⚠️ Resend ne délivre ce
domaine qu'aux adresses du compte propriétaire : c'est un filet de dev, jamais
un mode de production.

### ⚠️ Le point de rupture à connaître

**Le domaine de `MAIL_FROM` doit être vérifié chez Resend (SPF + DKIM)**, sinon
l'API répond 403 et *tout* s'arrête d'un coup. C'est la première chose à
regarder devant une panne d'e-mail généralisée — d'où le message explicite dans
`explainSendFailure()`.

### Vérification

`deno check` sur les **12 fonctions** touchant à l'e-mail : toutes passent.

⚠️ `deno check` échoue si on le lance sans `--node-modules-dir=none` : le
`node_modules/` du front interfère avec la résolution de `@supabase/supabase-js`.
C'est un artefact local — Supabase ne déploie pas ce dossier — mais il fait
croire à des erreurs qui n'existent pas.

`sendMail()` testée en isolation avec `fetch` bouchonné, **20 assertions** :
formes de `MAIL_FROM` (`adresse` et `Nom <adresse>`), replis, absence de clé,
URL et en-tête `Authorization`, `to` normalisé en tableau, `reply_to` en
snake_case, `text` auto-dérivé du HTML, `headers` omis si vide et transmis
sinon, codes 403/429, et exception réseau (`sendMail` ne lève jamais).

**Recette réelle non faite** : aucun e-mail n'a été envoyé pour de vrai. Il faut
une clé Resend valide et le domaine vérifié.

### Reste ouvert

- `crm-send-message` garde une branche **Brevo** via la passerelle Lovable,
  intacte : ce chemin ne passe pas par `sendMail()`.
- `process-email-queue` envoie toujours via l'**API Lovable**
  (`LOVABLE_API_KEY`), pas via Resend. Sans objet tant que la file n'est pas
  alimentée : `enqueue_email()` n'est appelée **nulle part** (ni fonction, ni
  trigger, ni front). Ne pas déployer cette fonction — son cron pg_cron
  scruterait des files vides toutes les 5 secondes.

---

## 20. Rattrapage du schéma — 02/09/2026

La base `hzjzqdlyehclnpeqkier` accusait **14 migrations de retard**. Le code
déployé attendait 82 tables, la base en avait 67.

### Comment on l'a découvert

Par accident, en cherchant tout autre chose. Une vérification de routine
(`SELECT … FROM cron.job`) a échoué sur `relation "cron.job" does not exist` :
pg_cron n'était pas installé, donc `email_infra` n'avait jamais été appliquée.
De fil en aiguille, l'écart s'est révélé bien plus large.

**La cause remonte au §16** : au retour sur le projet d'origine, le registre de
migrations n'a pas été relu. Lovable écrivait encore dans
`bumfyrfmormisyjletpb` — d'où le commit `projectRef` du 02/09, qui a corrigé
`vite.config.ts`, `mcp/index.ts` et le manifeste MCP. Les migrations
manquantes remontaient au **24/08**, pas au 31.

### La méthode, à réutiliser

Ne pas vérifier table par table à la main : **comparer deux inventaires**.

1. **Le contrat attendu** — extrait de `src/integrations/supabase/types.ts`,
   généré depuis le schéma cible : 82 tables, 993 colonnes.
2. **Le réel** — une introspection, renvoyée en une seule cellule :

```sql
SELECT string_agg(line, E'\n' ORDER BY line)
FROM (
  SELECT c.table_name || ':' || string_agg(c.column_name, ',' ORDER BY c.column_name) AS line
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
   AND t.table_type = 'BASE TABLE'
  WHERE c.table_schema = 'public'
  GROUP BY c.table_name
) s;
```

3. **Le diff** — 15 tables et 33 colonnes manquantes, **0 dérive inverse**. Un
   sous-ensemble strict : rien d'orphelin, aucune colonne fantôme. C'est ce qui
   a permis de rejouer les migrations sans réécrire quoi que ce soit.

⚠️ `types.ts` décrit ce que Lovable **croit** avoir créé. En cas d'écart entre
lui et une migration, la référence à trancher reste le SQL.

### Le script

`scripts/rattrapage-schema-20260902.sql` — les 14 migrations concaténées dans
l'ordre chronologique, **en une seule transaction**. Au moindre échec, rien
n'est appliqué : on relit l'erreur et on relance, sans état intermédiaire.

**Cinq blocs volontairement écartés**, chacun annoté `ÉCARTÉ` avec son motif :

- extensions `pgmq` / `pg_cron` / `pg_net` / `supabase_vault` ;
- files pgmq et wrappers RPC (`enqueue_email`, `read_email_batch`,
  `delete_email`, `move_to_dlq`) — personne n'appelle `enqueue_email()` ;
- le cron horaire de suivi colis, dont le garde-fou `__ANON_KEY__` lève une
  exception tant que la clé n'est pas renseignée — il aurait annulé toute la
  transaction.

⚠️ **Non rejouable après succès** : le second passage échoue sur
`auth_email_templates already exists`. Assumé, le script ne sert qu'une fois.

### ⚠️ Le piège de l'enum

La migration `role_permissions` insère des droits pour `order_validator` et
`auditor`. Si ces valeurs manquaient à l'enum `app_role`, **impossible de les
ajouter dans la même transaction** : Postgres interdit d'utiliser une valeur
d'enum créée dans la transaction courante. Il aurait fallu deux passes. Vérifié
avant de lancer — elles venaient de migrations de mai, déjà appliquées.

### Vérification

Le script a été rejoué sur un **PostgreSQL 15 jetable** : base miroir
reconstruite depuis l'introspection réelle (67 tables, 845 colonnes), script
appliqué, schéma obtenu comparé au contrat. Puis le même diff après application
sur la vraie base : **82/82 tables, 993/993 colonnes, 0 écart dans les deux
sens**.

### 🔴 Ce que l'épisode révèle — les erreurs avalées

Un test d'envoi d'e-mail était passé **au vert** alors que `email_templates`
n'existait pas. Pourquoi :

```js
const { data: tpl } = await admin.from('email_templates')…  // `error` jamais lu
await admin.from('customer_email_log').insert({…})          // retour ignoré
```

Table absente → `data: null` → la fonction retombe silencieusement sur le
contenu envoyé par le front, et ne journalise rien. **Un test vert ne prouvait
donc rien.** C'est ce qui a masqué le problème pendant une semaine.

Ce motif — `data` déstructuré sans `error`, `insert` dont le retour n'est jamais
lu — est récurrent dans le code généré. **À corriger, sinon la prochaine panne
sera tout aussi invisible.**

### Recette passée

Modèles d'e-mails, mot de passe oublié (avec son compteur anti-abus), et le
parcours newsletter complet : inscription, double opt-in, campagne,
désinscription. Tous fonctionnaient pour la première fois.

### Reste ouvert

- **`send-order-confirmation`** : commande de test non faite — seul chemin
  d'envoi non vérifié.
- **Cron de suivi colis** : bloc écarté, à rejouer avec la clé anon du projet
  si le suivi La Poste automatique est voulu.
- **`process-email-queue`** : déployée mais sans objet, aucune file alimentée.
  Sans danger tant qu'aucun cron ne l'appelle — vérifié, `cron.job` n'existe pas.
- **`types.ts`** : à régénérer pour confirmer (rien ne devrait bouger).

---

## 21. Migration vers notre Supabase — 03/09/2026

Le site tournait encore sur `bumfyrfmormisyjletpb`, le projet Supabase de
Lovable. Coût de maintien trop élevé : tout a été basculé sur
`hzjzqdlyehclnpeqkier`.

### 🔴 La découverte qui a tout déclenché

En analysant une sauvegarde, un détail ne collait pas : `customer_email_log`
contenait 29 lignes datées du 01/09, alors que **nous avions créé cette table
vide le 02/09** (§20). Impossible sur la même base.

Vérification : **164 occurrences de `bumfyrfmormisyjletpb` dans les données,
zéro de `hzjzqdlyehclnpeqkier`**. La sauvegarde venait de l'ancien projet — et
il était bien vivant : dernière commande le 02/09 à 23:54, accès admin le 03/09
à 09:28.

**Tout le travail des §19 et §20 avait donc été appliqué à une base que le site
n'utilisait pas.** `hzjz…` était en retard précisément parce que personne ne
s'en servait.

⚠️ **La leçon** : ne jamais déduire l'identité d'une base de son schéma. Seules
les **données** l'identifient — ici, une date de création incohérente.

### Le point de départ, favorable

Le rattrapage du §20 avait aligné `hzjz…` sur le schéma cible. Comparaison
colonne par colonne des deux projets : **82 tables, 993 colonnes, écart nul**.

La bascule n'était donc pas une migration de schéma mais un **transfert de
données** — nettement moins risqué.

### Comment les 2,4 Go ont été récupérés sans identifiants

Nous n'avions pas les accès de `bumfyr…`. Mais son bucket `media` est en
**lecture publique** : les 1 894 objets sont téléchargeables par URL, sans clé,
et réenvoyables avec la clé service_role du nouveau projet. Vérifié sur objets
réels avant de bâtir le script.

🔴 **La règle qui en découle** : `bumfyr…` devait rester **actif** jusqu'à la fin
du transfert. Un projet en pause coupe le stockage — les fichiers seraient
devenus irrécupérables. Ordre imposé : *copier → vérifier → recetter → arrêter*.

### Les trois pièges rencontrés

**1. Les UUID de comptes ne concordaient pas.** Deux comptes existaient déjà
dans `hzjz…` avec la même adresse mais un identifiant différent —
`6000art@gmail.com` et `doffull@live.fr`. Choix retenu : garder ceux de la
cible, donc **remapper** les 36 références dans les données métier et les 934
dans l'analytique. Sans ça, le rôle admin et une commande étaient rejetés.

⚠️ `6000art@gmail.com` avait **deux** identités (e-mail + Google). En exclure
une seule faisait échouer `auth.identities`.

**2. Les collisions de clés uniques, invisibles.** `hzjz…` n'était pas vierge :
recette, lignes de configuration, `role_permissions` du §20. Ces lignes
portaient des identifiants différents mais occupaient les mêmes clés uniques.
`ON CONFLICT DO NOTHING` les écartait **en silence**, et l'échec ne surgissait
que plusieurs tables plus loin, sur une clé étrangère.

Cas vécu : la connexion de `6000art@gmail.com` du 03/09 avait créé une fiche
client vide, qui a fait rejeter la vraie fiche — 785 points de fidélité, 711 €
dépensés — puis échouer `loyalty_transactions`. **Une ligne sur 6 305.**

Solution : purger les 82 tables de la cible avant l'import, plutôt que traiter
les collisions une à une. Le script de purge porte un **garde-fou d'identité** —
il cherche les comptes de recette qui n'existent que dans `hzjz…` et refuse de
s'exécuter ailleurs. Testé dans les deux sens.

**3. Les structures internes de Supabase divergent.**
`supabase_migrations.schema_migrations` avait 6 colonnes côté source, 3 côté
cible. Le fichier généré échouait sur `created_by`.

⚠️ **Même angle mort deux fois** : le schéma `public` avait été comparé colonne
par colonne, **pas les schémas internes**. Comparer les données sans comparer
les contenants.

### Ce qui a été migré, et ce qui ne l'a pas été

| Migré | |
|---|---|
| `public` | 82 tables, 14 568 lignes |
| `auth` | 8 comptes + 8 identités (2 conservés côté cible) |
| `storage` | bucket `media` + 1 894 objets, 2,4 Go |
| `supabase_migrations` | 186 entrées |
| URLs réécrites | 164 références, 7 tables, 22 colonnes |

**Volontairement écarté** : l'état de session (`sessions`, `refresh_tokens`,
`flow_state`… 85 lignes) — signé avec le secret JWT de l'ancien projet, donc
inutilisable ; le versionnage interne de Supabase (223 lignes) — le copier
casserait les mises à jour de la plateforme ; les buckets privés (4 objets :
3 bordereaux déjà imprimés, 1 export).

### Méthode de validation

Chaque script a été rejoué sur un **PostgreSQL 18 jetable**, sur une cible
reconstruite depuis la sauvegarde puis piégée pour reproduire l'état réel de
`hzjz…` — comptes préexistants et données de recette comprises.

**L'erreur rencontrée en production a été reproduite à l'identique** (même
ligne, même contrainte) avant d'être corrigée : c'est ce qui a permis
d'identifier la vraie cause plutôt que de deviner.

Contrôle final sur la base réelle : 13 tables témoins toutes `OK`, 0 URL
résiduelle, 0 commande orpheline, tous les triggers réactivés, 1 894 objets.

⚠️ **Un seul maillon n'avait pas pu être testé** : l'envoi vers le storage de
`hzjz…`, faute de clé service_role. D'où la consigne d'essayer sur 5 fichiers
avant les 1 894.

### ⚠️ Les scripts ne sont pas dans le dépôt

Ils contiennent la base en clair : 6 305 fiches clients, 10 empreintes bcrypt,
la clé PayPlug `sk_live_…`, les identifiants PayPal et WooCommerce. Ils ont été
livrés hors dépôt et doivent être détruits après usage.
`scripts/migration-bumfyr-vers-hzjz/` est ignoré par Git.

### Reste à faire

- **Secrets Edge Functions** dans `hzjz…` : PayPal, PayPlug, Colissimo,
  La Poste, Gemini, Google Maps, Brevo, Twilio, `SEND_EMAIL_HOOK_SECRET`.
  (Resend et `MAIL_*` sont posés depuis le §19.)
- **Hook d'authentification** à réactiver.
- **Déployer le front** avec le nouveau `projectRef` (commit `6b6fdad5`).
- **Recette** : page produit (les images d'abord), connexion, tunnel de
  commande, e-mail transactionnel.
- **Arrêter `bumfyr…`** — en dernier, jamais avant.
- **Le cron `poll-carrier-tracking-hourly`** pointait sur l'ancien projet avec
  son ancienne clé anon. À recréer proprement dans `hzjz…`, ou à abandonner.

---

## 22. Audit du nouveau projet — 07/09/2026

Contrôle en **lecture seule** de `hzjzqdlyehclnpeqkier` après la migration du
§21. Aucune écriture. Mené avec la clé publique puis la `service_role`.

### 🔴 Trois comptes admin inconnus, créés le 04/09

| Compte | Créé | Dernière connexion |
|---|---|---|
| `preprod.helvetica-mp.com.overrule608@passmail.net` | 04/09 14:11 | **05/09 20:24** |
| `sylvain@ackuracy.com` | 04/09 18:06 | jamais |
| `alexis@ackuracy.com` | 04/09 18:09 | jamais |

Le premier — fiche client au nom d'« **Ackuracy Pentest** » — a parcouru
`/admin`, `/admin/commandes`, `/admin/clients`, `/admin/parametres`,
`/admin/security`, `/admin/roles` et `/admin/audit` entre 17:36 et 18:10.

Tout indique un **audit de sécurité commandité** : nom de société explicite,
adresse jetable dédiée à `preprod`, et `6000art@gmail.com` était sur
`/admin/roles` à 14:45, onze minutes avant le premier octroi. **À confirmer
formellement** — à défaut, trois comptes ont les pleins droits sur la base.

⚠️ **`role_audit_log` ne trace pas l'auteur** : `changed_by` est à `null` sur
les six lignes. Le journal d'audit ne remplit donc pas son office — en cas de
vrai incident, aucune traçabilité.

*(Détail : chaque changement de rôle est journalisé **deux fois**, les triggers
`trg_audit_role_change` et `user_roles_audit` faisant double emploi.)*

### ✅ Ce qui est sain

**La RLS est étanche.** Testé avec la clé publique sur 13 tables sensibles —
`customers`, `orders`, `payment_gateway_secrets`, `paypal_config`, `user_roles`,
`crm_contacts`… — **toutes renvoient 0 ligne**. Les 6 305 clients et les clés de
paiement sont invisibles depuis le front.

**Les données publiques répondent** : 107 produits sur 114 (les 7 autres en
brouillon, correctement filtrés), 6 catégories, 15 boutiques, 11 pages.

**Les 4 fonctions publiques sont joignables** — le `verify_jwt = false` du §20
fait son office. Les fonctions admin refusent la clé publique (401/403), et même
la `service_role` sur `payment-keys`, `ai-keys` et `tracking-key`, qui exigent
un JWT d'admin réel.

**Volumétrie conforme** : 14 tables témoins aux valeurs attendues.

### Secrets — l'état réel

Une partie des clés vit **en base**, donc déjà migrée :

| | État |
|---|---|
| PayPal | `client_id_live` + secret en base, mode **live**, webhook enregistré |
| PayPlug | `sk_live_…` en base |
| WooCommerce | `ck_…` + `cs_…` en base — ⚠️ dernière synchro en **`failed`** (01/09) |
| Colissimo / La Poste | vérifié en direct, de **vrais points relais** remontent |

Manquants, identifiés par sondage des fonctions :

| Secret | Symptôme |
|---|---|
| `GOOGLE_API_KEY` | `maps-config` → 503 « Clé Google Maps non configurée » |
| `LOVABLE_API_KEY` et/ou `GOOGLE_MAPS_API_KEY` | `boutique-lookup` → 500 « connector not configured » |
| `GEMINI_API_KEY` ou `LOVABLE_API_KEY` | `contact-chat` → 500 « Erreur du service IA » |

⚠️ **`GOOGLE_API_KEY` et `GOOGLE_MAPS_API_KEY` sont deux clés distinctes**, tout
comme `LAPOSTE_API_KEY` (points relais) et `LAPOSTE_TRACKING_API_KEY` (suivi).
Les confondre donne des pannes silencieuses.

### ⚠️ Lister les secrets exige un jeton de compte

Ni la clé publique ni la `service_role` ne donnent accès aux secrets des Edge
Functions : la CLI exige un jeton `sbp_…`, qui ouvre **tout le compte**
Supabase. Vérifié — les deux autres formats sont rejetés d'office
(`LegacyInvalidAccessTokenError`).

Pour un simple inventaire, passer par le dashboard ou
`npx supabase secrets list` : la sortie ne contient que des noms et des
empreintes, jamais les valeurs.

### 🔴 La clé Gemini ne suffira pas

Clé testée directement contre l'API Google. Elle **s'authentifie** — les erreurs
portent sur le modèle et le quota, jamais sur l'identité. Mais deux blocages :

1. **Crédits épuisés** — `429 Your prepayment credits are depleted`.
2. **Modèles indisponibles** — `404 models/gemini-2.5-flash is no longer
   available to new users. Please update to models/gemini-3.6-flash`.

Or le code demande encore `google/gemini-2.5-flash` (3 fois), `2.5-pro` (2) et
`2.5-flash-image` (1). Ces modèles restaient accessibles **via la passerelle
Lovable**, qui a son propre contrat Google. En passant en direct, on devient un
« nouvel utilisateur » aux yeux de Google et ils sont refusés.

**Poser `GEMINI_API_KEY` en l'état casserait six fonctions IA** qui marchaient :
`contact-chat`, `analyze-product-image`, `product-ai-helpers`,
`parse-products-pdf`, `parse-stock-pdf`, `virtual-tryon`.

Trois options, aucune tranchée : recharger les crédits **et** migrer les modèles
`2.5 → 3.6` ; rester sur `LOVABLE_API_KEY` (l'IA remarche aussitôt, mais la
dépendance qu'on cherche à quitter demeure) ; ou ne rien faire — l'IA n'est pas
critique pour vendre, la boutique et les paiements tournent sans.

💡 La clé Gemini peut aussi se poser **depuis l'admin** : elle atterrit dans
`payment_gateway_secrets` (ligne `gemini_api`), **qui prime sur la variable
d'environnement**. Pas besoin de secret Supabase.

### Reste à faire

- **Confirmer l'audit Ackuracy**, ou révoquer les trois comptes.
- **Corriger `role_audit_log`** : `changed_by` à `null` le rend inutile.
- Poser `GOOGLE_API_KEY`, `GOOGLE_MAPS_API_KEY`, `LOVABLE_API_KEY`.
- **Hook d'authentification** à réactiver, **front à déployer**, puis recette.
- **Arrêter `bumfyr…`** — en dernier, jamais avant.

## 23. Remise en service après la migration — 08/09/2026

Journée de rattrapage : la bascule du §21 avait laissé derrière elle **tous les
secrets** et quelques réglages qui ne vivaient que dans le tableau de bord de
l'ancien projet. Chaque fonctionnalité touchée est tombée à son tour, sans lien
apparent entre elles.

> ⚠️ **La leçon, à retenir avant tout le reste** : ce qui n'est pas dans le
> dépôt n'existe pas. Secrets, buckets, `verify_jwt` — rien de tout cela ne
> suit une migration. Le §21 avait prévenu pour les données ; ce §23 le
> confirme pour la configuration.

### Ce qui a été remis en marche

| Domaine | Ce qui manquait | Où ça se règle |
|---|---|---|
| Connexion Google | provider jamais activé | Google Cloud + Auth Supabase |
| Google Maps | secret `GOOGLE_API_KEY` | secrets Edge Functions |
| IA (16 fonctionnalités) | `GEMINI_API_KEY` + facturation AI Studio | `/admin/chatbot` |
| IPN PayPlug | `verify_jwt` resté à `true` | `config.toml` |
| Étiquettes Colissimo | six défauts cumulés, cf. plus bas | code |

### Connexion Google — le déclencheur de vérification

Le code front était complet depuis l'origine (`Auth.tsx:109`), seul le provider
n'avait jamais été configuré. Deux pièges rencontrés :

- l'écran de consentement laissé en **Testing** n'autorise que les comptes
  listés à la main ;
- ⚠️ **c'est le logo qui déclenche la vérification de marque**, pas les scopes.
  Avec `openid`, `email`, `profile`, une application se publie sans validation
  — sauf si on téléverse un logo. Les deux griefs de Google étaient alors
  fondés : domaine non prouvé dans Search Console, et **les CGV déclarées comme
  politique de confidentialité** alors que `/confidentialite` existe.

⚠️ **`Site URL` valait `http://localhost:3000`** : Supabase y retombe
silencieusement quand le `redirectTo` demandé n'est pas autorisé, ce qui
renvoyait les utilisateurs sur leur machine. Les `Redirect URLs` doivent porter
un `/**`, `Auth.tsx:28` construisant `window.location.origin + nextPath`.

### IA — deux clés, jamais trois

Les 16 fonctionnalités reposent sur **`LOVABLE_API_KEY`** seule ; `GEMINI_API_KEY`
est facultative et ne couvre que les dix fonctions passant par `callGemini()`.
Ordre de résolution : ligne `gemini_api` en base → secret `GEMINI_API_KEY` →
passerelle Lovable.

Six fonctions — vidéo `veo-3.0`, image `gpt-image-2`, essayage virtuel, retouche
de pose, gabarit depuis mockup, import PDF produits — **n'ont aucun chemin
direct** et resteront captives de la passerelle.

*(La panne finale ne venait pas du code : la facturation Google AI Studio
n'était pas activée.)*

### IPN PayPlug — 401 avant même d'atteindre le code

`payplug` n'ayant aucune entrée dans `config.toml`, `verify_jwt` valait `true` :
la passerelle Supabase rejetait la notification, qu'aucun webhook ne peut
signer. Le corps de la réponse le disait — `UNAUTHORIZED_NO_AUTH_HEADER`, message
de la passerelle, là où une fonction ouverte répond depuis son propre code.

**Conséquence** : `applyPayment()` n'était jamais déclenchée. Un paiement n'était
confirmé que si le client revenait sur `/checkout`, onglet ouvert. **27
transactions sur 34 sont restées en `created`**, à recouper avec le portail.

`paypal-webhook` et `carrier-tracking-webhook` étaient dans le même cas. Les
ouvrir ne coûte rien en sécurité : chacune s'authentifie elle-même — relecture
du paiement chez PayPlug, signature vérifiée par PayPal, jeton partagé pour le
transporteur.

### 🔴 Colissimo — la chaîne n'avait jamais fonctionné en point relais

Le constat qui a tout orienté : **0 étiquette sur 16 commandes en point relais,
contre 4 sur 18 à domicile.** Six défauts empilés, découverts un à un, chacun
masquant le suivant :

1. **`A2P` forcé** dès que l'adresse contenait « point relais ». A2P désigne les
   commerces Pickup ; les seize points étaient des bureaux de poste, donc `BPR`.
2. **`pickupLocationId` absent**, obligatoire pour A2P, BPR, ACP, CDI, CMT, BDP
   et PCS. La cause racine est en amont : `Checkout.tsx:224` reçoit
   `identifiant` et `typeDePoint` et n'en garde qu'une phrase d'affichage.
3. **Adresse de 125 caractères** dans `line2`, pour 35 autorisés.
4. **Nom commercial manquant** — `[30018]`, exigé hors domicile.
5. **Le bucket `labels` n'existait pas.** Ses politiques d'accès, elles,
   existaient depuis le 18/08 : des règles pour un bucket que personne n'avait
   créé.
6. **Un refus renvoyé comme une réussite** : Colissimo répond `200` même en cas
   d'échec, le motif ne vivant que dans `<messages>`. Le code renvoyait
   `success: true` avec des champs à `null`.

⚠️ **`pickupLocationId` va dans `<parcel>`, jamais dans `<service>`** — vérifié
dans le WSDL SOAP *et* dans l'exemple officiel de l'API REST. Le placer dans
`service` fait échouer la validation du schéma, dont la séquence est ordonnée.

Plutôt que d'imposer d'abord une reprise de la base et du tunnel d'achat, le
point de retrait est **relu chez La Poste au moment de l'étiquette**, d'après le
nom et le code postal contenus dans l'adresse (`_shared/colissimo.ts`). Les
seize commandes déjà passées sont redevenues imprimables sans migration.

### Deux voies d'étiquetage, chacune à moitié aveugle

Découvert en fin de journée, et c'est le défaut le plus instructif :

| Voie | Numéro de suivi | Étiquette archivée |
|---|---|---|
| `colissimo-proxy` (SOAP, `/admin/colissimo`) | ✅ | ❌ |
| `create-colissimo-label` (REST, `/admin/bordereau/:id`) | ❌ | ✅ |

La première n'archivait rien ; la seconde lisait `meta.labelResponse`, **un nom
que Colissimo n'emploie nulle part** (`labelV2Response` en national, la racine à
l'international), si bien que le numéro n'était jamais lu — et comme il n'est
écrit que s'il est trouvé, l'échec était silencieux.

D'où deux écrans qui se contredisaient sur la même commande, chacun disant vrai
depuis sa moitié d'état. Et, plus grave, **aucune garantie que le numéro
enregistré corresponde à l'étiquette imprimée** : `HMP-MTRH9SZV` a porté deux
numéros contradictoires, `HMP-MTRI5TN4` a été affranchie **trois fois**.

Les deux voies écrivent désormais le même état complet — numéro, archive, URL
signée, date, transporteur, passage à `Shipped` sans lequel la commande n'entre
ni dans l'écran Colissimo ni dans le bordereau. Deux commandes ont été
rattrapées, numéro relu dans le PDF archivé.

### Le bon de préparation devient un PDF

Trois tentatives d'impression navigateur ont échoué avant d'en trouver la cause,
double :

- l'étiquette est servie par le stockage, donc **cross-origin** : son contenu
  n'est pas imprimable depuis la page ;
- **la seule présence du plugin PDF** fait échouer `window.print()`, sans
  message ni boîte de dialogue.

`order-slip-pdf` produit désormais le document d'un bloc avec `pdf-lib` : A4
paysage, bon à droite, étiquette **incrustée** à gauche à sa taille réelle. L'écran
n'en est plus que la visionneuse — **une seule mise en page**, donc ce qui
s'affiche est ce qui s'imprime. L'impression fonctionne parce que le PDF arrive
en base64 et devient une URL blob, de même origine.

⚠️ **Affranchir engage un colis.** La création d'étiquette est conditionnée à
`allow_label_creation`, faux par défaut : ouvrir la page d'une commande non
étiquetée n'affranchit jamais.

### Vérification

Tout a été contrôlé **contre l'API et les données réelles**, jamais en
supposant : les identifiants Colissimo via l'action publique `getRelayPoints`,
les 9 points de retrait résolus chez La Poste, le PDF généré hors ligne avec
l'étiquette réelle de `HMP-MTRH9SZV`, les schémas lus dans le WSDL et le YAML
publiés par Colissimo.

⚠️ **Une clé `service_role` a été utilisée pendant cette session** pour le
diagnostic. À révoquer.

---

## 24. Assainissement de l'infrastructure — 08 au 10/09/2026

Trois jours consacrés non pas à des fonctionnalités, mais à ce qui les portait :
la facturation, le registre des migrations, le stockage et les accès. Toutes les
pannes décrites ici ont une cause commune — **le transfert du 04/09 (§21) a
recopié les données, pas leur contexte**.

### 24.1 🔴 Ce que le client paie n'est pas toujours ce qui est comptabilisé

Audit du tunnel, du panier à l'écriture en base. Le socle est sain : les prix ne
viennent jamais du client, la RPC `validate_and_create_order` les relit dans
`products`. Un panier trafiqué ne change pas le montant.

Six défauts au-dessus de ce socle, dont trois qui touchent l'argent :

| | Défaut |
|---|---|
| 🔴 | **Ouvrir puis « Enregistrer » une commande remisée regonfle le total.** `AdminOrders.tsx:572` recalcule `Σ price × qty` — les prix BRUTS — alors que `orders.subtotal` est stocké NET de remise. Une commande à 84,50 € payés repasse à 104,50 € facturés. |
| 🔴 | **La remise n'est stockée nulle part** : ni le code, ni le montant. Impossible de rapprocher. `useAnalyticsData` la reconstruit par `subtotal + port − total`, ce qui vaut **toujours 0**, et cherche le code promo dans `orders.notes` où rien ne l'écrit jamais. |
| 🟠 | **Devise PayPal libre** (`AdminPayPal.tsx:260` propose USD/GBP/CHF) et envoyée sans conversion : passer sur CHF facturerait 100 CHF une commande de 100 €. |
| 🟠 | **Aucun contrôle du montant réellement capturé** — ni PayPal, ni PayPlug, ni le webhook ne comparent la capture à `orders.total`. |
| 🟠 | **Le remboursement partiel est perdu** : `payment_status = 'partially_refunded'` → `initcap` → `'Partially_Refunded'` → viole le CHECK, l'UPDATE est rejeté et **l'erreur n'est pas testée**. La commande reste `Paid` au montant plein. |
| 🟡 | **1 centime d'écart sur ~3,8 % des commandes avec promo en %** : la remise n'est jamais arrondie, `orders.total` passe par NUMERIC(10,2) tandis que la passerelle reçoit `toFixed(2)` d'un flottant. Mesuré sur 1,78 M de combinaisons. |

⚠️ **La TVA n'existe nulle part.** Prix TTC, `orders.tax` renseigné mais jamais
ventilé. Si la société est assujettie, 16,67 % de chaque encaissement ne sont
comptabilisés nulle part, et la facture ne porte ni base HT, ni taux, ni montant.
**Décision comptable en suspens.**

### 24.2 La preuve que le dépôt n'est pas le déploiement

Une commande du jour affichait 28,17 € de TVA — soit exactement `169 × 0,2 / 1,2`,
la formule d'une version de `validate_and_create_order` que le dépôt avait
pourtant remplacée par `v_tax := 0`.

Le dump de schéma l'a confirmé : **la fonction en ligne est l'ancienne**. Et,
heureusement, elle **conserve les garde-fous promo** — plafond `max_discount`,
respect de `usage_limit`, incrément de `usage_count` — que la version du dépôt
avait perdus. Déployer le dépôt les aurait supprimés.

Le numéro de commande sert d'horodatage : `HMP-${Date.now().toString(36)}`.
`MTSD91AO` en base 36 donne 1788853607376, soit le 08/09 à 07:46 UTC.

### 24.3 🔴 `storage.objects` n'avait AUCUNE politique

```sql
select policyname from pg_policies where schemaname = 'storage';
-- 0 ligne
```

RLS active, zéro règle : tout refusé pour `authenticated`. Le back-office ne
pouvait plus envoyer la moindre image.

Invisible pendant des jours parce que **seuls les accès navigateur étaient
touchés** : l'affichage public passe par `/storage/v1/object/public/`, les edge
functions par la `service_role`. Deux chemins qui contournent la RLS.

Rétabli par `20260908124500` : 8 politiques, 2 buckets. Même angle mort que le
bucket `labels`, découvert trois jours plus tôt.

### 24.4 `supabase db push` était inutilisable — réparé par un baseline

**284 versions déclarées appliquées, pour 188 fichiers au dépôt.** Une centaine
d'entrées ne correspondait à rien, et à l'inverse des objets décrits par les
fichiers n'existaient pas. `db push` sautait ce qu'il croyait fait.

Remède : un **baseline** de l'état réel (`supabase db dump`), vérifié contre un
inventaire de la base — 82 tables, 36 fonctions, 62 triggers, 214 policies,
7 vues, 67 index, 4 types, 4 extensions, 378 grants. Les 188 fichiers passent
dans `_archive/`, le registre est purgé et réamorcé sur cette seule version.

```
Local          | Remote         | Time (UTC)
20260909120000 | 20260909120000 | 2026-09-09 12:00:00
Remote database is up to date.
```

⚠️ Le baseline **fige l'existant, pas l'idéal** : la TVA calculée y est donc
gravée, garde-fous promo compris. C'est volontaire.

⚠️ `_archive/` n'est pas lu par le CLI, mais **ne pas le supprimer** : c'est la
seule trace de l'intention d'origine, et c'est en le relisant qu'on a su quoi
reconstruire — deux fois.

### 24.5 92 % des erreurs Postgres venaient du suivi de visite

5 523 erreurs en 24 h, toutes identiques :

```
23505  duplicate key value violates unique constraint "visitor_sessions_session_id_key"
```

`session_id` vit dans `sessionStorage` et survit au rechargement ; `startedRef`
est une ref React, remise à zéro. Chaque rechargement rejouait donc un INSERT sur
une clé déjà prise. Le client avalait l'erreur — l'analytique est best-effort —
mais Postgres la journalisait.

Aucun dégât fonctionnel. Le vrai coût : **une vraie erreur serait passée
inaperçue**. Corrigé par `upsert` + `ignoreDuplicates` et un marqueur en
`sessionStorage`.

### 24.6 178 % du quota d'egress, pour 694 Mo d'objets

444 Go de « cached egress » sur un quota de 250. Deux causes cumulées :

- le transfert du 04/09 a recopié les objets **sans en-tête `cache-control`**, et
  l'API Storage retombe alors sur `no-cache` : chaque affichage retélécharge
  l'image entière. 407 des 420 objets inspectés étaient dans ce cas ;
- sur les **six** points d'envoi du code, **quatre** ne fixaient aucun
  `cacheControl`.

Rattrapage ponctuel par `scripts/fix-media-cache-control.sh` (copie S3 sur place,
rien n'est téléchargé), et unification du code derrière `mediaUploadOptions()`.

⚠️ **`curl -I` ment.** Le CDN de Supabase répond `no-cache` à **toutes** les
requêtes HEAD, quel que soit l'objet. Ce détail nous a fait conclure à tort, trois
fois de suite, que ni l'UPDATE SQL, ni la copie S3, ni un réenvoi complet ne
fonctionnaient. Vérifier en GET :

```sh
curl -s -D - -o /dev/null "<url>?v=$RANDOM" | grep -i cache-control
```

⚠️ **`storage.objects.metadata` n'est qu'un miroir** alimenté à l'upload, pour le
listing. Le corriger en SQL ne change rien à l'en-tête servi — mais suffit à
tromper `head-object`, donc toute logique d'idempotence qui s'y fierait.

⚠️ Le fond reste entier : **1,7 Mo par image en moyenne**, avec des PNG à 7 et
20 Mo. Les Image Transformations sont à **0/100**, entièrement disponibles.

### 24.7 Les accès de l'audit de sécurité étaient restés ouverts

Une adresse jetable Proton (`preprod.helvetica-mp.com.overrule608@passmail.net`,
« Ackuracy Pentest ») recevait **chaque notification de commande**, avec le nom
des clientes. Elle avait le rôle `admin`, accordé 45 min après sa création, sans
traçabilité (`role_audit_log.changed_by = null`), comme les trois autres comptes
Ackuracy.

Le préfixe de l'alias révèle autre chose : le compte a été créé sur
**`preprod.helvetica-mp.com`**, et se retrouve en production. Les deux
environnements partagent le même projet Supabase — « préprod » n'est qu'un second
domaine devant la même base. Le Basic Auth posé depuis protège l'accès, pas
l'isolation.

Rôle retiré, compte banni sans suppression pour ne pas créer d'orphelins.
`alexis@` et `sylvain@ackuracy.com` restent admins, **jamais connectés**.

⚠️ Le rôle ne suffit pas à couper les notifications d'un compte banni :
`send-order-notification` lit `user_roles` + `customers`, jamais le bannissement.

⚠️ `role_audit_log` enregistre **chaque événement en double** — le trigger
`audit_role_change` est branché deux fois.

### 24.8 Corrections d'écran

- **Le détail d'une commande additionnait une TVA déjà comprise dans le total** :
  169,00 € s'affichaient 197,17 €. Libellés passés à « dont TVA » / « Total TTC ».
  ⚠️ `handleSave` porte toujours la même formule — cf. 24.1.
- **Le mode de paiement n'apparaissait sur aucune commande** : le sélecteur
  proposait des libellés (« Carte bancaire », « PayPal »…) quand la base contient
  `manual`, `paypal`, `payplug`, `test`. Radix ne trouvait aucun `SelectItem` et
  n'affichait rien.
- **Le mail admin « Nouvelle commande » pointait vers `lvatk6000art.lovable.app`**.
  Audit des autres gabarits au passage : c'était le seul lien fautif.

### 24.9 État à la clôture

| Réglé | |
|---|---|
| `supabase db push` | ✅ réparé, une seule version |
| Politiques `storage` | ✅ 8 rétablies |
| Envoi d'images depuis l'admin | ✅ fonctionne |
| Cache des médias | ✅ un an, immuable, futurs envois inclus |
| Erreurs Postgres | ✅ −92 % |
| Compte de pentest | ✅ rôle retiré, compte banni |

| En suspens | |
|---|---|
| 🔴 Clé `service_role` utilisée en diagnostic | à révoquer |
| 🔴 `alexis@` / `sylvain@ackuracy.com` | admins, jamais connectés |
| 🟠 `AdminOrders.tsx:572` | le total regonflé à l'enregistrement |
| 🟠 TVA | décision comptable |
| 🔴 Poids des images | analysé le 11/09 → **§25**, en attente de décision client |
| 🟡 Préprod et production | même base Supabase |
| 🟡 Restriction Google Maps | encore sur `.net` côté console Cloud |

⚠️ **Une clé `service_role` a de nouveau été utilisée pendant ces trois jours**
pour le diagnostic. À révoquer avec la précédente.

---

## 25. Poids des images — analyse du 11/09/2026 ⏸️ en attente de décision client

**Rien n'a été modifié.** Analyse seule, à reprendre après arbitrage avec le client :
la modification touche l'ensemble du catalogue visuel, elle n'est pas anodine.

### Où en est la facturation

581 GB de cached egress sur 250 inclus (**232 %**), dont **545 GB concentrés sur
quatre jours** (07→10/09 : 85, 100, 195, 165 GB). Période de grâce jusqu'au
**11/10/2026** ; au-delà, les projets répondent **402** si l'organisation reste
au-dessus du quota.

Le correctif `cache-control` de §24.6 **tient** : vérifié en GET sur 85 objets de
production (40 images produits + 45 galerie), **85/85** en
`public, max-age=31536000, immutable`. Les 3 vidéos MP4 aussi, et elles sont
légères (475 Ko – 1,2 Mo).

⚠️ **Ne pas conclure trop vite à partir du 11/09.** Les ~5 GB de cette journée
correspondent à ~4 h écoulées (cf. Compute Hours), soit **1,25 GB/h** — contre
6,9 GB/h le 10/09, mais pour un **budget de 0,35 GB/h** si l'on veut tenir les
250 GB du cycle. On est donc encore à ~3,6× au-dessus, et ces 4 heures sont les
plus creuses de la journée. Le chiffre décisif est celui du 11/09 en fin de
journée. À noter : le compteur MAU (95) ne voit que les comptes **authentifiés** —
le trafic anonyme de la boutique n'apparaît nulle part dans ce rapport.

### Ce que pèsent réellement les images

| Constat | Mesure |
|---|---|
| Objets référencés en base | 581 (40 `image` + 541 galerie/hover/vidéo) |
| Poids moyen | ~0,75 Mo |
| Les deux plus lourdes | 6,12 et 5,78 Mo, **4096 × 4096 px** (exports IA bruts) |
| Part GIF + PNG | 76 % du poids échantillonné |

**Le site sert du 4096 px dans des emplacements de 308 px.** Mesuré en production :

| Élément | Affiché | Source | Excès |
|---|---|---|---|
| Logo | 73 × 40 | 2148 × 1181 | ×730 |
| Vignette produit (desktop) | 308 × 410 | 2752 × 1536 | ×33 |
| Vignette produit (mobile) | 164 × 219 | 2400 × 1340 | ×90 |

🔴 **`srcset` est absent partout** : un mobile télécharge le même fichier qu'un
écran 4K. C'est le gain le plus important **et le seul sans aucun risque visuel**
(×4 environ sur la moitié du trafic). À traiter en premier, indépendamment du reste.

### Qualité : le risque n'est pas où on l'attend

Le gain vient des **dimensions**, pas du taux de compression. À 1600 px, passer de
q90 à q70 double le gain de poids et ne change presque rien à l'image
(écart moyen 0,75 → 0,89 sur 255) : la réduction d'échelle moyenne les artefacts
avant qu'ils ne soient visibles. On peut donc rester généreux sur la qualité.

Risques mesurés, par ordre d'importance :

1. **Aplats sombres** — sur les zones de luminance < 60, l'erreur est **40 % plus
   élevée** que la moyenne. Le tissu noir perd du grain (visible au zoom 3×
   seulement). C'est notre cas défavorable : le catalogue est très majoritairement
   noir. → **q85 minimum** sur les produits sombres.
2. **Double compression** sur les sources déjà JPEG : erreur ~1,5× supérieure à
   celle obtenue depuis un PNG, pour un gain faible (6–18× contre 100–600× sur les
   PNG 4096 px). → **q82 minimum**, peu d'intérêt à forcer.
3. **Chroma subsampling** WebP : bavure des rouges/oranges saturés.
4. **Zoom produit** : à vérifier avant tout traitement — non vérifié à ce jour.

### L'approche à retenir : générer des dérivés, ne rien détruire

Le stockage est à **0,87 Go sur 100 Go** : il ne coûte rien, c'est l'egress qui
coûte. Donc **conserver les masters 4096 px** et servir des dérivés à côté.
Le zoom continue de tirer le master, un réglage qui déplaît se régénère, rien
n'est irréversible.

| Usage | Dérivé | Qualité |
|---|---|---|
| Vignette grille | 800 px | q85 |
| Page produit / hero | 1600 px | q85 |
| Zoom | master intact | — |
| Logo | SVG, ou 200 px | — |
| GIF animés (9 fichiers, 8 Mo) | MP4 / WebM | ×10–20 |

Sur cette base, le PNG de 6,12 Mo tombe à ~21 Ko en vignette et ~62 Ko en page
produit, sans perte visible à taille d'affichage.

⚠️ **Les Image Transformations ne sont pas la solution** : le plan Pro n'inclut
que **100 images d'origine par mois**, or le catalogue en compte 581. Elles
restent utiles en dépannage ponctuel.

### À faire quand le client aura tranché

1. `srcset` (sans risque, à sortir du lot) ;
2. vérifier l'existence d'un zoom produit ;
3. pipeline de dérivés + génération des dérivés existants ;
4. traitement à l'upload dans `mediaUploadOptions()`, sans quoi le problème
   revient à chaque nouveau produit ;
5. identifier qui produit les images — si ce sont des exports IA 4096 px bruts,
   le vrai correctif est en amont.

⚠️ Décision à prendre **avant le 20/09** (fin de cycle) : conserver le spend cap
(risque de 402 sur la boutique) ou le désactiver (dépassement facturé).

---

## 26. Retour d'anomalies client — 11/09/2026

Tableau de 12 anomalies (`Suivi_anomalies_boutique.xlsx`). Chacune a été
confrontée au code avant d'être chiffrée : **3 bugs réels** (ANO-001, 007, 012),
**4 déjà faites ou quasi** (002, 004, 008, 010), **3 vrais manques** (006, 009,
réception de 008), **2 à requalifier** (003, 005), **1 décision produit** (011).

Deux ont été traitées. Le reste est en §26.4.

### 26.1 ANO-001 — l'essai virtuel, deux défauts en série

**Côté serveur.** `virtual-tryon` appelait en dur `ai.gateway.lovable.dev`,
abandonnée à la sortie de Lovable (§16, §18). Constaté en production :
`500 {"error":"LOVABLE_API_KEY missing"}`. C'était l'une des rares fonctions IA
à ne pas passer par `_shared/gemini.ts`, donc sans repli sur la clé Gemini et
**sans délai maximum** — l'appel pendait jusqu'à la coupure de la plateforme à
150 s, d'où le « chargement infini ».

⚠️ **La couche compatible-OpenAI de Google ne génère pas d'image.** Elle accepte
la requête, répond 200, ne renvoie jamais rien. La génération passe
obligatoirement par l'API **native** `:generateContent` avec
`responseModalities: ["IMAGE","TEXT"]`, l'image arrivant dans
`candidates[].content.parts[].inlineData`. Aucune fonction du projet n'avait
jamais utilisé ce chemin pour de l'image — seulement pour du texte.

**Côté client — le vrai responsable du message vu par l'utilisateur.**
`supabase.functions.invoke` ne met PAS le corps de la réponse dans `data` quand
le statut n'est pas 2xx : il renvoie un `FunctionsHttpError` dont le `.message`
vaut **toujours** « Edge Function returned a non-2xx status code ». Le JSON utile
est dans `error.context`. Sans déballage, les messages soignés des fonctions
n'atteignent jamais l'écran.

Nouveau `src/lib/edgeFunctionError.ts`, appliqué à **41 appels**. Sur les 236
`if (error) throw error` du projet, la quasi-totalité vise des requêtes base de
données où ce traitement n'a aucun sens : seuls les 53 qui suivent un
`functions.invoke` ont été retenus. Six écrans déballaient déjà le contexte,
chacun avec sa propre implémentation (cinq copies inline + `readFunctionError`
dans `productPdfImport.ts`) — laissés en l'état, mais ils gagneraient à
converger.

**Les refus de Gemini.** Mesuré sur la fonction déployée :

| Entrée | Résultat |
|---|---|
| silhouette synthétique | 0 refus / 5 |
| mode mannequin | 0 refus / 2 |
| photo de personne A | refusée au 1er appel 8 fois sur 10 |
| photo de personne B | refusée 9 fois sur 9, réessais compris |

⚠️ **Le taux varie fortement dans le temps** : la photo A est passée de ~17 % à
80 % de refus en une heure, sans aucun changement de notre côté. Toute mesure
ponctuelle est à relativiser — je m'y suis laissé prendre deux fois.

Le refus est en revanche largement **aléatoire** : sur 12 appels identiques,
5 réussissent au 1er coup, 2 sont rattrapés au 2e, 2 au 3e. D'où
`MAX_IMAGE_ATTEMPTS = 3`, qui fait passer une photo difficile de **42 % à 75 %**
de réussite. Chaque tentative rapporte autant que la précédente : une 4e
aiderait encore.

⚠️ **Budget global obligatoire.** `composite()` est appelé une fois par vêtement
(boucle de couches) **plus** une fois pour la passe haute-fidélité : trois
vêtements en haute fidélité = jusqu'à 12 appels. Sans plafond on dépasse les
150 s de la plateforme, qui tue la fonction sans réponse — c'est-à-dire qu'on
réintroduit le « chargement infini » qu'on vient de corriger.
`REQUEST_BUDGET_MS = 120 s`, vérifié avant chaque tentative. Mesuré sur le cas
le plus lourd : **58 s**, largement sous le plafond.

**Validation en production** : 4 cas nominaux sur 4, dont le multi-vêtements.

### 26.2 ANO-002 — la roulette

La **création du code promo fonctionnait déjà** : `spin_roulette` insère dans
`promo_codes` et trace le tirage dans `roulette_spins`. Rien à redévelopper.

Le défaut responsive était réel : `DialogContent` portait `overflow-hidden`
sans hauteur maximale ni défilement. Mesuré en paysage 740×360, le dialogue
descendait à 480 px dans une fenêtre de 360 — bouton « Tourner » 120 px hors
écran, inatteignable. Corrigé par `max-h-[92dvh]` + corps défilant, en-tête
fixe. La roue, carrée, n'était bornée qu'en largeur : plafond `46dvh` ajouté.

Le mode test existait mais se pilotait en posant `lvtk:demoMode` dans le
localStorage depuis la console. Exposé en interrupteur dans Admin → Roulette.
⚠️ Il ne change que le comportement d'ouverture : **un tirage reste réel et crée
un vrai code promo**.

### 26.3 🔴 La roulette était invisible pour tout le monde sauf les admins

Découvert en cherchant à tester ANO-002 : impossible de trouver le bouton en
production. Ce n'était pas un réglage.

`roulette_config` et `roulette_segments` portent chacune deux politiques
RESTRICTIVE issues du durcissement post-audit (§24.7) : refus total pour `anon`,
lecture réservée aux admins pour les connectés. Les vues assainies
`roulette_config_public` / `roulette_segments_public` avaient été créées
précisément pour exposer une version publique — mais en
**`security_invoker = true`**, elles s'exécutent avec les droits de l'appelant et
se font bloquer par ces mêmes politiques. Elles ne remplissaient donc pas leur
rôle, et `RouletteFab` sortait toujours sur
`if (!config?.enabled || segments.length === 0) return null`.

Réparé par `20260911140000` : les deux vues passent en **SECURITY DEFINER**.
Aucune politique n'est supprimée ni assouplie ; les tables restent
inaccessibles en direct.

⚠️ **Ne pas « corriger » en ouvrant les tables à `anon`** : la RLS filtre des
LIGNES, pas des COLONNES. La table exposerait `probability_weight` — les
**probabilités de gain** — ainsi que `reward_value`, `min_purchase`,
`max_discount` et `code_prefix`. C'est exactement ce que les vues excluent.

Le `GRANT ALL ... TO anon` posé par le baseline sur les deux tables a été
révoqué : il était neutralisé par les politiques RESTRICTIVE, mais rien ne
justifie une défense à une seule ligne. `authenticated` et `service_role` sont
inchangés. Vérifié après migration : les vues répondent en anonyme, les tables
renvoient `42501 insufficient privilege`.

⚠️ L'analyseur Supabase signalera ces vues comme SECURITY DEFINER. C'est
recherché et sûr : filtrage en colonnes et en lignes, aucune donnée personnelle.

### 26.4 Ce qui reste

| ID | Sujet | État |
|---|---|---|
| 🔴 ANO-012 | Taux de conversion **fabriqué** : `sessions = max(count, count×34+40)` (`AdminAnalytics.tsx:130`) converge vers 1/34 quel que soit le réel. Une vraie table `visitor_sessions` existe et n'est pas utilisée. Côté CA, §24.1 : remise toujours nulle, code promo cherché dans `orders.notes` où rien ne l'écrit | à faire, **priorité 1** |
| 🔴 ANO-007 | Compteur clients bloqué à 1 000. L'import n'est pas en cause (il découpe bien) : `useCustomers()` fait `.select('*')` **sans pagination** et l'écran affiche `customers.length`. PostgREST plafonne à 1 000. ⚠️ **10 autres hooks ont le même défaut** | à faire |
| 🟠 ANO-004 | Actions en masse : 7 existent déjà dans `AdminOrders`. Ce que le client demande (assigner, marquer prêtes) vit dans **`AdminPreparations`**, qui n'a aucune sélection multiple | brancher `useBulkSelection` |
| ✅ **Hors tableau** | **Expéditions hors France.** Le pays n'était jamais demandé au checkout et l'étiquette déclarait toujours `FR`. 15 commandes concernées, dont 4 payées et une pour Montréal. → **`COLISSIMO_INTERNATIONAL.md`** (analyse), **`COLISSIMO_ARBITRAGE.md`** (décisions) | **corrigé le 14/09/2026, §27** |
| 🟠 ANO-008 | Envoi Resend déjà opérationnel. Seule la **réception** manque : aucun webhook inbound | à faire |
| ANO-006 / 009 | Relance paniers abandonnés · deux canaux de messagerie | à créer |
| ANO-010 | `FileDropZone` fait déjà tout (drag & drop, images + MP4/WebM). Reste à le brancher dans `AdminBoutiques:303`, `AdminFooter:324`, `AdminAuthEmails:262` | remplacement mécanique |
| 🟡 ANO-003 / 005 | Scroll bloqué · écart 14/52 | à requalifier avec le client |
| ANO-011 | Live : déjà en polling 8–10 s ; le temps réel est **désactivé volontairement** pour ne pas diffuser de données personnelles | décision produit |

### 26.5 Pièges relevés en chemin

1. ⚠️ **8 fonctions dépendent encore de la passerelle Lovable** : `image-pose-edit`,
   `generate-product-video`, `generate-slide-image`, `boutique-lookup`,
   `crm-send-message`, `process-email-queue`, `send-order-notification`,
   `ai-keys`. Elles échoueront comme l'essai virtuel. Les **trois premières font
   de la génération d'image** : il leur faudra aussi l'API native, pas seulement
   la clé.
2. ⚠️ **`game_type` n'a aucun effet.** `MainLayout` monte `UnifiedFab`, qui rend
   `RouletteFab` **en dur** (`UnifiedFab.tsx:397`) sans passer par `GameRouter`.
   La config vaut `flash`, ce qui devrait afficher `GameScratchFab` — elle est
   ignorée. **`FabStack.tsx` n'est référencé nulle part : code mort.**
3. Le drapeau `refusal` renvoyé par `virtual-tryon` n'est **pas exploité par
   l'interface** (toast générique au lieu d'un « choisir une autre photo »).
4. Le **mode mannequin n'a jamais été refusé** par Gemini. C'est la piste si le
   taux de refus sur photo cliente devient gênant commercialement.

---

## 27. Expéditions hors France — 14/09/2026 ✅

Le blocage annoncé au §26.4 est levé. Première étiquette suisse réelle :
`HMP-MTVEO78Y` → suivi `CA724839632FR`.

Deux documents accompagnent cette section : **`COLISSIMO_INTERNATIONAL.md`**
(l'analyse du 11/09, conservée pour le raisonnement) et
**`COLISSIMO_ARBITRAGE.md`** (les décisions client, une par problème, avec ce qui
a été implémenté). Les lire avant de toucher à quoi que ce soit ici.

### 27.1 Ce qui était cassé, en une phrase

Le pays n'était jamais demandé à la cliente — `country: 'France'` figé dans
`Checkout.tsx` — et l'étiquette déclarait toujours `FR` à Colissimo. Un code
postal suisse à quatre chiffres annoncé en France est un format invalide :
Colissimo refusait. **Le transporteur n'y était pour rien.**

### 27.2 La table Colissimo est la source unique

`src/data/colissimo-capabilities.json` est le fichier officiel du plugin
WooCommerce Colissimo (`assets/misc/capabilitiesByCountryFR.json`) : **10 zones,
251 pays**, avec pour chacun le code produit à domicile avec et sans signature,
l'existence du réseau point relais et l'obligation de déclaration douanière.

```
src/data/colissimo-capabilities.json          ← source, fichier officiel
scripts/generate-colissimo-capabilities.mjs   ← dérive les deux modules ci-dessous
src/lib/colissimo-capabilities.ts             ← @generated, NE PAS ÉDITER
supabase/functions/_shared/colissimo-capabilities.ts   ← @generated, NE PAS ÉDITER
```

⚠️ **Le même module est généré à deux endroits** parce que le front (Vite) et les
edge functions (Deno) ne partagent aucun chemin d'import. Pour mettre la table à
jour : remplacer le JSON, relancer `node scripts/generate-colissimo-capabilities.mjs`,
committer les trois fichiers.

📌 **Trancher sur cette table, jamais de mémoire.** J'avais d'abord affirmé que le
code produit `DOM` était réservé à la France et qu'il fallait un code
international : **c'était faux**, et c'est le plugin officiel qui a tranché. `DOM`
vaut pour FR, CH et BE ; **DE, ES, IT, GB, US et CA n'acceptent que `DOS`** (avec
signature) ; les DOM-TOM ont leurs propres codes (`COM`/`CDS`).

### 27.3 Tarif hors France — forfait unique

| | |
|---|---|
| Déclencheur | `country !== 'FR'`, sans distinction de zone |
| Montant | **40 € TTC**, réglable dans Admin → Checkout |
| Port | **remplacé**, jamais additionné |
| Franco à 99 € | **ne s'applique pas** hors France |
| TVA | **inchangée** — arbitrage client du 14/09 |
| Libellé client | **« Supplément d'expédition internationale »** |

⚠️ **Ne jamais écrire « frais de douane » côté boutique.** Sans déclaration DDP,
le transporteur réclame malgré tout les droits réels à la réception : la cliente
aurait le sentiment de payer deux fois, et se retournerait vers la boutique.

⚠️ **La règle vit à deux endroits et doit rester identique** :
`computeShippingCost` (`src/hooks/useCheckoutConfig.ts`) et la RPC
`validate_and_create_order`. Toute modification de l'un doit être reportée dans
l'autre, sinon le prix affiché et le prix encaissé divergent.

📌 Un code promo **« livraison offerte » n'annule pas** le forfait international :
il couvre un envoi France, pas le surcoût d'un envoi hors frontière. Sans cette
réserve, la règle se contournait avec un code promo.

### 27.4 Déclaration douanière (CN23)

Générée automatiquement dès que la table l'exige (`cn23: true` — CH, GB, US, CA,
DOM-TOM). **Sans elle, aucune étiquette ne sort pour ces destinations**, quelles
que soient les autres corrections.

📌 Colissimo renvoie alors **deux documents** : l'étiquette puis la CN23 (A4,
4 exemplaires). Ils sont fusionnés en un seul PDF à l'enregistrement — voir
**§27.8**, où le bug qui les perdait est décrit.

Deux réglages dans **Admin → Colissimo → Déclaration douanière** :

| Réglage | Valeur | Colonne |
|---|---|---|
| Code SH par défaut | **`620240`** | `admin_config.colissimo_customs_hs_code` |
| Pays de fabrication | **`CN`** | `admin_config.colissimo_customs_origin_country` |

⚠️ **`620240` doit rester renseigné.** La décision initiale était de laisser le
champ vide ; le premier envoi réel a montré que **Colissimo refuse sans code SH**.
`620240` = doudoune à enveloppe synthétique, positions « femmes » — note 9 du
chapitre 62 : un vêtement non identifiable homme/femme s'y classe. À affiner par
produit si le catalogue se diversifie (`6109` T-shirts, `6110` sweats, `6505`
cagoules — le chapitre dépend du **procédé**, 61 tricot / 62 tissé, pas du
vêtement).

⚠️ **Deux contraintes de l'API**, relevées dans le plugin officiel :
l'API **refuse les accents** dans la description d'article (« Doudoune matelassée »
casse l'appel), et tronque à **64 caractères** la description, **44** le `artref`.

### 27.5 Un seul chemin d'étiquetage — la leçon de la journée

C'est le point à retenir de toute cette section.

Deux implémentations d'étiquetage coexistaient. La première,
**`create-colissimo-label`**, ne reçoit qu'un `order_id` et **relit la commande en
base**. La seconde, l'action `generateLabel` de **`colissimo-proxy`**, recevait
l'adresse **recopiée champ par champ par l'appelant**.

**Aucun des cinq appelants de la seconde ne transmettait `customer_country`.** La
normalisation retombait sur `FR`, et le bug corrigé le matin même réapparaissait
intact sur ce chemin. Corriger le lecteur ne suffisait pas : il fallait que les
appelants fournissent la donnée, ce qu'aucun ne faisait — et rien ne le signalait,
puisque le repli sur `FR` est silencieux par construction.

Le plus grave n'était pas le bouton de l'écran Commandes mais
**`auto-colissimo-label`**, qui étiquette les commandes dès leur paiement : il
lisait `customer_country` puis l'omettait. Toute commande étrangère payée échouait
**sans témoin**.

Tout passe désormais par `create-colissimo-label` : l'étiquetage automatique, le
bouton de l'écran Commandes, la génération et les retours de l'écran Colissimo,
les régénérations du bordereau, et `order-slip-pdf`.

⚠️ **`create-colissimo-label` accepte l'appel en clé de service**, reconnu par
comparaison avec `SUPABASE_SERVICE_ROLE_KEY`. Sans cette porte, l'étiquetage
automatique se heurtait à un 401 : les clés `sb_secret_…` ne sont pas des JWT,
`auth.getClaims` échoue dessus.

⚠️ **L'écran Commandes enregistre la fiche avant de demander l'étiquette.**
L'étiquette se construisant depuis la base, une correction de pays non
sauvegardée serait sinon ignorée en silence.

📌 Effet de bord favorable : `colissimo-proxy` déclarait **`<weight>1.0</weight>`
en dur** — tout colis annoncé à un kilo. Le poids réel des articles
(`products.weight_grams`) est désormais transmis.

### 27.6 Pièges à connaître

1. ⚠️ **`orders.customer_country` contient deux écritures.** Les commandes
   antérieures au 14/09 portent le libellé complet (« France », « Suisse » saisi à
   la main en admin) ; les nouvelles portent un code ISO. `normalizeCountryCode`
   reconnaît les deux — il existe en **deux exemplaires**
   (`src/lib/colissimo-countries.ts` et `supabase/functions/_shared/colissimo-countries.ts`),
   à faire évoluer ensemble.
2. ⚠️ **Le point relais n'existe pas partout** (`pr: false` pour CH, GB, US, CA).
   Trois verrous : masqué au checkout, refusé par la recherche de points, refusé à
   l'étiquetage. Une commande relais en Suisse n'est récupérable à aucun de ces
   trois stades — d'où la redondance, qui est volontaire.
3. ⚠️ **Le code postal n'est validé strictement qu'en France.** Ailleurs les
   formats sont trop variés (CA `H2G 2Y6`, GB `SW1A 1AA`, IE sans code postal) pour
   qu'une règle maison apporte autre chose que des faux refus.
4. `supabase db push` reste sûr tant que `supabase migration list` montre local et
   distant alignés — vérifié le 14/09. Le §18 rappelle pourquoi on ne le suppose
   jamais.
5. 🟡 **Reste ouvert** : la commande de Montréal (`HMP-MTWC73RZ`) sera le premier
   envoi en `DOS`. Ce code n'a encore **jamais été émis** en production.

### 27.7 Ce qui reste à faire

| Sujet | État |
|---|---|
| 3 commandes payées à expédier (`HMP-MTVTXC5P`, `HMP-MTVW5TB1`, `HMP-MTVWZVYS`) | ✅ fait — `customer_country` corrigé en `CH`, expédiées avec leur numéro de suivi |
| **7 étiquettes suisses au fichier corrompu** (`MTVEO78Y`, `MTVTXC5P`, `MTVW5TB1`, `MTVWZVYS`, `MTXGANCT`, `MU1NP5O2`, `MU3404QV`) | ⚠️ générées avant le correctif du 16/09 : leur PDF est la concaténation étiquette + CN23, donc un des deux documents est invisible. À régénérer si le colis n'est pas encore parti — voir §27.8. ⚠️ **régénérer crée un NOUVEAU numéro de colis** et écrase `tracking_number` |
| Codes SH par produit | 🟡 `620240` couvre les doudounes ; le genre est déjà en base (`products.category`), le mapping serait automatique |
| Information douanière à la cliente | ❌ écartée par le client — hors UE, elle paiera **en plus** à la réception, ce n'est écrit nulle part |
| Tarif réel par zone | ❌ écarté : le forfait de 40 € remplace la grille |

### 27.8 Étiquettes A4 et déclaration douanière — 16/09/2026 ✅

Le client signalait une « notice de découpage » manquante sur les envois hors
France. Ouvrir une étiquette suisse réelle a réglé la question — et en a
soulevé **deux autres**, dont une qui coûtait de l'argent au destinataire.

📌 **La leçon de la journée** : deux hypothèses successives, toutes deux
plausibles, toutes deux fausses. Ce qui a tranché, c'est d'**ouvrir le fichier
réellement produit** — pas de relire le code, pas de comparer au plugin
officiel. Le §18 le dit déjà autrement : le dépôt n'est pas le déploiement.
Ici : le code n'est pas le document.

#### Combien de pages, et qui décide

| Destination | Pages | Contenu |
|---|---|---|
| **France** | **1** | la planche A4 : étiquette + notice |
| **Union européenne** (BE, DE, ES, IT, LU, NL…) | **1** | idem — l'UE n'exige pas de CN23 |
| **Hors UE** (CH, GB, US, CA…) **et DOM-TOM** (GP, MQ, RE, NC, PF…) | **5** | 1 planche + **4 exemplaires de CN23** |

La distinction n'est PAS France / hors France : la Belgique sort en 1 page. Le
critère est `cn23` dans `src/data/colissimo-capabilities.json` — **223 pays sur
251** l'exigent.

**Le système décide seul**, sans réglage ni case à cocher :
`orders.customer_country` → `normalizeCountryCode` → `requiresCn23()` → bloc
`customsDeclarations` ajouté ou non → Colissimo renvoie un ou deux documents →
fusion en 1 ou 5 pages.

⚠️ **Tout repose sur le pays enregistré sur la commande.** C'est le seul point
où une erreur humaine se propage jusqu'à la douane, et c'est exactement ce qui
a coûté la journée du 14/09 (§27.1). Un libellé inattendu fait retomber
`normalizeCountryCode` sur `FR` : la CN23 n'est alors pas demandée, et le colis
part sans déclaration. Voir aussi §27.6 point 1 (deux écritures coexistent).

📌 Les **4 exemplaires** sont le défaut de Colissimo — nous n'envoyons ni
`OUTPUT_PRINT_TYPE_CN23` ni `numberOfCopies`. Si ce défaut changeait, le nombre
de pages changerait sans qu'une ligne de notre code bouge.

#### La CN23 était produite, mais perdue à l'enregistrement

Colissimo renvoie **deux documents** quand une déclaration douanière est
demandée : l'étiquette (10×15) puis la CN23 (**A4, 4 exemplaires**). Ses
défauts sont exactement ceux qu'il faut — `OUTPUT_PRINT_TYPE_CN23` et
`numberOfCopies` n'ont jamais eu besoin d'être envoyés.

`extractPdf` prenait du **premier `%PDF` au dernier `%%EOF`** : elle collait
les deux documents bout à bout dans un fichier invalide. Et rien ne le
signalait — le fichier s'ouvre, mais ce qu'on y voit dépend du lecteur. `file`
lit le premier en-tête et montre l'étiquette seule ; `pdfinfo` suit le dernier
`startxref` et montre la CN23 seule, **sans l'étiquette**.

⚠️ Sondage des 60 dernières commandes étiquetées : **7 fichiers concaténés,
toutes les commandes suisses**, aucune des 51 françaises ni des 2 belges —
l'UE n'exige pas de CN23. Le défaut touchait donc exactement les destinations à
déclaration douanière, depuis l'ouverture de l'international.

Corrigé : découpage sur la `boundary` annoncée, repli par découpage à **chaque**
`%PDF`, fusion `pdf-lib` en un PDF valide. Un document unique reste renvoyé
**octet pour octet** — les envois France ne repassent par aucune réécriture. Si
la fusion échoue, l'étiquette seule est conservée : une CN23 à réimprimer vaut
mieux qu'une expédition bloquée.

Vérifié en production sur `HMP-MU3UG33Z` (Gingins, CH) : **5 pages**, page 1
l'étiquette, pages 2 à 5 la CN23 — d'abord en 10×15, puis en A4 après le
passage de format décrit plus bas.

#### ⚠️ `totalAmount` est le PORT, pas le total de la commande

Colissimo imprime ce champ sur la CN23 sous « **Frais de port** ». Le plugin
officiel y met `get_shipping_total()` — le port seul — et renseigne à
l'identique `totalAmount` et `transportationAmount`
(`LabelGenerationPayload.php:1004`).

Ce code envoyait `order.total`. Sur `HMP-MU3UG33Z` la CN23 déclarait donc
**243,83 € de port** pour 169 € de marchandise, alors que le port réel est de
**40 €**. La douane calcule ses droits sur marchandise + port : le destinataire
payait sur **412,83 € au lieu de 209 €**, près du double. Le défaut était
invisible tant que la CN23 elle-même se perdait à l'enregistrement.

📌 **Colissimo refuse une CN23 dont le port vaut zéro.** Aucun montant n'est
inventé pour contourner : un chiffre faux sur un document douanier est pire
qu'un refus, lequel remonte en 422 avec le motif et se corrige en renseignant
le port sur la commande. Un `console.error` le signale d'avance.

#### La « notice de découpage » n'était ni la CN23 ni son format

Le client réclamait en réalité le **panneau d'instructions** qui accompagne la
planche A4 : « Comment utiliser votre étiquette Colissimo ? », avec les
pointillés et la mention « **découpez selon les pointillés** ». Il n'existe pas
dans la vignette 10×15.

| | `PDF_10x15_300dpi` | `PDF_A4_300dpi` |
|---|---|---|
| Rendu | vignette nue | **A4 paysage** : étiquette à gauche, trait de coupe, notice à droite |
| Usage | imprimante thermique | imprimante bureautique |
| Plugin officiel | — | **valeur par défaut** |

📌 Le document de référence fourni par le client sortait de **Coliship**
(l'outil web de La Poste), pas de l'API — visible en pied de page. L'essai a
confirmé que l'API rend la même planche.

**Depuis le 16/09/2026, `PDF_A4_300dpi` s'applique à TOUTES les destinations**,
France comprise, à la demande du client après essai sur l'international.

⚠️ **Le A4 est un format bureautique.** Il ne s'imprime pas sur la thermique
10×15 dont le kit nous avait été fourni. Le jour où cette imprimante reprend du
service, revenir au 10×15 — la constante `labelPrintingType` est isolée pour
que ce retour tienne en une ligne, et le vrai correctif serait de rendre le
choix réglable en administration, sur le modèle du code SH.

Rien d'autre ne dépend du format : aucune feuille de style d'impression, aucun
gabarit, aucune dimension codée côté front.

#### Ce qui reste ouvert

| Sujet | État |
|---|---|
| Format d'étiquette réglable en admin (`admin_config`) | 🟡 aujourd'hui en dur — à faire si la thermique reprend du service |
| **EORI absent** (`fields.field[]` jamais envoyé) | ❌ écarté par le client le 16/09. Le plugin officiel *refuse* les envois US sans EORI et ajoute la TVA pour le UK — un envoi US ou UK partirait incomplet |
| Dimensions du colis (`LENGTH`/`WIDTH`/`HEIGHT`) | 🟡 jamais envoyées |
| `invoiceNumber` vs `importersReference` | 🟡 le plugin envoie le premier, nous le second |

Le détail complet de l'enquête, y compris l'hypothèse d'abord retenue puis
réfutée, est conservé dans **`COLISSIMO_CN23_FORMAT.md`**.


---

## 28. Paiements en ligne et notifications — 15/09/2026

Trois défauts distincts, découverts en remontant un seul signalement : « PayPlug
renvoie une erreur 401 sur notre webhook ».

### 28.1 Les webhooks de paiement n'avaient jamais fonctionné

`config.toml` déclarait bien `verify_jwt = false` pour `payplug`,
`paypal-webhook` et `carrier-tracking-webhook`. **La production disait
l'inverse.** La passerelle Supabase rejetait donc tout appel avant d'atteindre
le code :

```
{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}
```

Un prestataire de paiement n'envoie évidemment aucun JWT Supabase. **Les trois
fonctions appelées par des tiers étaient inaccessibles depuis toujours** — les
autres (`maps-config`, `newsletter-subscribe`, `contact-chat`) fonctionnaient,
ce qui rendait le défaut invisible.

C'est le **§18 dans sa forme la plus coûteuse** : le réglage était correct dans
le dépôt, faux en production, et rien dans l'interface ne le montrait.

⚠️ **Le test qui révèle le problème** — aucun en-tête, comme un vrai webhook :

```bash
for f in payplug paypal-webhook carrier-tracking-webhook; do
  printf "%-26s → " "$f"
  curl -s -X POST -H "Content-Type: application/json" -d '{}' \
    "https://hzjzqdlyehclnpeqkier.supabase.co/functions/v1/$f" | head -c 100
  echo
done
```

| Réponse | Lecture |
|---|---|
| `UNAUTHORIZED_NO_AUTH_HEADER` | ❌ la passerelle bloque — le webhook est mort |
| `{"error":"Action inconnue"}` (payplug) | ✅ le code est atteint |
| `{"received":true}` (paypal) | ✅ le code est atteint |
| `{"error":"Unauthorized"}` (carrier) | ✅ le code est atteint — c'est **la fonction** qui refuse, faute de jeton partagé |

**À relancer après tout redéploiement de ces trois fonctions.**

### 28.2 Ce qui masquait le problème — et ce qu'il a coûté

Les commandes étaient malgré tout encaissées, parce que **le navigateur de la
cliente faisait le travail du webhook** : au retour sur `/checkout?payplug=…`,
le front appelle `payplug` avec `action: 'check-order'`, et cet appel-là porte
la clé anon — donc pas de 401.

**Le paiement n'était donc confirmé que si la cliente revenait sur le site.**
Onglet fermé, réseau coupé, paiement validé sur mobile puis abandon : argent
encaissé, commande jamais passée en `Paid`, aucune étiquette, aucun e-mail.

⚠️ **Piège de mesure.** Un premier comptage sur les transactions `paid` a conclu
« aucune perte ». C'était faux : **une transaction ratée reste bloquée à
`created`**, elle ne figure jamais parmi les `paid`. Le bon filtre est l'inverse.

`HMP-MU0365ZX` est le cas d'école : transaction restée `created` avec
`updated_at` identique à `created_at` — jamais mise à jour — et commande passée
`Paid` à la main **26 h plus tard**.

🟡 **43 transactions `created` avec commande non payée restent à vérifier chez
PayPlug.** La plupart sont sûrement des abandons ordinaires (70 `created` pour
53 `paid`, taux plausible), mais la pile contient au moins un vrai règlement.

### 28.3 Carte et PayPal n'envoyaient aucun e-mail

Le checkout a **trois chemins**, et les e-mails n'étaient branchés que sur un :

```
Bouton « Commander »   → handlePlaceOrder → send-order-confirmation   ✅
Bouton PayPlug         → create-payment → applyPayment                ❌
Bouton PayPal          → create-order → capture-order                 ❌
```

Une cliente réglant 169 € par carte ne recevait **rien** entre son paiement et
l'avis d'expédition, qui arrivait plus tard via `auto-colissimo-label`.

C'est la **même structure que les deux implémentations d'étiquetage Colissimo**
(§27.5) : plusieurs chemins pour une même intention, un seul correctement câblé.

La confirmation part désormais de **là où le paiement devient certain, côté
serveur** — `applyPayment` (PayPlug), `capture-order` et le webhook (PayPal) —
via `_shared/payment-confirmation.ts`. Elle couvre donc le retour du navigateur,
la notification du prestataire et une régularisation ultérieure.

### 28.4 Le verrou anti-doublon vit dans la base

Depuis la correction, un même paiement peut être confirmé par trois voies
concurrentes : webhook, retour navigateur, régularisation manuelle. Les deux
premières arrivent souvent **dans la même seconde**.

⚠️ **Une vérification applicative ne suffit pas** : deux exécutions simultanées
liraient toutes deux « pas encore envoyé ». C'est l'`INSERT` dans
`notification_log` qui réserve la place, et l'index unique partiel
`notification_log_payment_confirmation_once` qui fait échouer le perdant
(`23505`).

📌 L'index est **restreint à `payment_confirmation`** : les notifications
internes ont légitimement plusieurs destinataires, donc plusieurs lignes par
commande. Un index global les aurait cassées.

⚠️ **`notification_log.recipient` est `NOT NULL`.** La réservation doit donc lire
la commande *avant* de réserver. Une première version omettait ce champ :
l'insertion aurait échoué et **aucun e-mail ne serait jamais parti**, sans la
moindre erreur visible.

### 28.5 Une seule notification interne, au paiement

Décision client du 15/09/2026. L'administration ne reçoit plus que
**« 🛍️ Nouvelle commande »**, et seulement une fois le règlement encaissé.

| Notification | État |
|---|---|
| 🛍️ Nouvelle commande | ✅ conservée — **au paiement**, plus à la création |
| 💳 Commande payée | ⛔ c'était le **même envoi**, seul le sujet changeait. Le libellé « Nouvelle commande » est désormais unique |
| 📦 Nouvelle commande à préparer | ⛔ appel commenté — `AdminOrders`, deux endroits |
| 🛠️ Préparation assignée | ⛔ appel commenté — `AdminPreparations` |
| 👤 Nouveau rôle attribué | ⛔ appel commenté — `AdminCustomers` |

📌 **Rien n'est supprimé**, à la demande du client : les branches serveur de
`send-order-notification` restent intactes. Réactiver = décommenter un appel.

⚠️ **Conséquences à connaître** :
1. Une commande créée mais non payée n'alerte plus personne — c'est l'effet
   recherché, la majorité des commandes créées n'étant jamais réglées.
2. **Plus personne n'est prévenu qu'une commande attend d'être préparée.**
   L'équipe doit consulter le tableau de bord.
3. Les e-mails aux clientes sont **inchangés**. Les traitements métier aussi :
   le stock est réservé, la préparation assignée, le rôle attribué — seules les
   mentions « notifié » à l'écran ont été retirées, elles seraient devenues
   fausses.

### 28.6 Dettes relevées en chemin

1. ⚠️ **`paypal-webhook:103`** — `if (verification === "SUCCESS" || !config?.webhook_id)`.
   Si `paypal_config.webhook_id` est un jour vidé, la fonction **applique tout
   événement sans vérifier la signature**, et n'importe qui peut marquer une
   commande payée. Aujourd'hui sans effet (le champ est renseigné, env `live`),
   mais un repli qui s'ouvre quand la configuration manque devrait refuser.
2. ⚠️ **`paypal-webhook:110`** — `paypalOrderId`, issu du corps de la requête,
   est interpolé sans échappement dans un filtre `.or(...)` PostgREST.
   Inatteignable tant que la signature est vérifiée, mais c'est une valeur non
   maîtrisée sur un chemin public.
3. 🟡 **`send-order-confirmation` est ouverte et sans contrôle d'appelant**
   (`verify_jwt = false`, aucune vérification dans le corps) : utilisable comme
   relais d'envoi d'e-mails.

### 28.7 Ce qui reste à faire

| Sujet | État |
|---|---|
| Vérifier les **43 transactions `created`** chez PayPlug | 🟡 **priorité** — au moins un vrai paiement s'y trouve |
| Test PayPlug de bout en bout (code de notification à `200`) | ⏳ en cours |
| Les trois dettes du §28.6 | 🟡 à traiter |
