# HELVETICA-MP

Boutique e-commerce **techwear** (React/Vite + Supabase), livrée avec un
back-office de 46 pages qui permet de tout piloter sans toucher au code :
catalogue, stock multi-emplacements, commandes, expéditions Colissimo,
paiements, CRM, fidélité, SEO — et un éditeur de design qui reconstruit les
pages publiques depuis la base.

**C'est un produit administrable, pas un site vitrine.** La majorité du code
sert le back-office, pas la boutique.

- **Production** : https://helvetica-mp.com
- **Projet Supabase** : `hzjzqdlyehclnpeqkier`

---

## Démarrage

Node **22** (voir `.nvmrc`).

```sh
git clone https://github.com/doffull/warltkfr.git
cd warltkfr
npm install
cp .env.example .env      # puis renseigner VITE_SUPABASE_*
npm run dev
```

L'application ne démarre pas sans `VITE_SUPABASE_URL` et
`VITE_SUPABASE_PUBLISHABLE_KEY`.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement (génère d'abord les fichiers SEO) |
| `npm run build` | build de production |
| `npm run build:protected` | build + obfuscation et verrou de domaine |
| `npm run preview` | sert le build local |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run seo:files` | régénère `sitemap.xml` et `robots.txt` |

## Structure

```
src/
  pages/            23 routes, dont /admin/* (46 pages) et /compte/*
  components/       composants boutique, admin et UI (shadcn/Radix)
  hooks/            accès aux données (TanStack Query)
  context/          panier, auth, devise, réglages globaux
  lib/              utilitaires, serveur MCP, garde de licence
supabase/
  functions/        45 edge functions (Deno)
  migrations/       historique SQL — lire l'avertissement ci-dessous
scripts/            génération SEO au build
```

## Stack

React 18 · TypeScript · Vite · Tailwind · shadcn/Radix · TanStack Query ·
Supabase (PostgreSQL + RLS, edge functions Deno) · Resend · PayPal · PayPlug ·
Colissimo.

---

## Configuration

La configuration vit à **quatre endroits distincts**, à ne pas confondre :

| Où | Quoi |
|---|---|
| `.env` | variables `VITE_*` — publiques, embarquées dans le bundle |
| Shell / scripts | variables sans préfixe, lues hors du bundle |
| Secrets Supabase | clés serveur des edge functions |
| Base de données | `payment_gateway_secrets` et tables `*_config`, réglées depuis `/admin` |

⚠️ **Quand une clé existe à la fois en base et en secret Supabase, c'est la base
qui gagne.** Modifier le secret sans vider la ligne correspondante ne change
rien. Concerne Gemini, le suivi La Poste, le webhook transporteur et PayPlug.

`.env.example` documente chaque variable, avec ses pièges. Inventaire complet
dans `variables.md`.

## Supabase

Déployer **une** fonction :

```sh
npx supabase login
npx supabase link --project-ref hzjzqdlyehclnpeqkier
npx supabase functions deploy <nom-de-la-fonction>
```

⚠️ **Ne pas lancer `supabase functions deploy` sans nom** : les 45 fonctions
partiraient d'un coup, y compris celles qui n'ont pas été relues.

### 🔴 Migrations — ne pas utiliser `supabase db push`

Le registre des migrations est faussé : lors du transfert de projet du
04/09/2026, `supabase_migrations` a été recopié tel quel (186 entrées). Supabase
considère donc comme appliquées des migrations qui ne l'ont jamais été sur ce
projet.

**Conséquences déjà constatées** : le bucket `labels` n'existait pas, et
`storage.objects` n'avait aucune policy — tout envoi d'image depuis l'admin
échouait.

**En attendant un rebasage propre : appliquer les migrations à la main dans
l'éditeur SQL du dashboard**, et vérifier le résultat. Détail au §21 de
`PROJECT.md`.

---

## Branches

| Branche | Rôle |
|---|---|
| `main` | branche de référence |
| `prod` | branche de travail, reportée sur `main` par merge |

## Documentation

| Fichier | Contenu |
|---|---|
| **`PROJECT.md`** | document de reprise — architecture, historique, pièges, dette. **À lire en premier.** |
| `variables.md` | inventaire commenté de toutes les variables |
| `.env.example` | configuration, avec les pièges de chaque clé |
| `AUDIT_REPORT.md` | audit de sécurité |

## À savoir avant de toucher au code

- **Le dépôt n'est pas le déploiement.** Avant de conclure qu'une fonctionnalité
  existe, vérifier qu'elle est en ligne : `npx supabase functions list`.
- **Le projet s'appelait `LVTK6`.** Les clés `localStorage` et les événements DOM
  sont encore préfixés `lvtk:`. Ne pas les renommer sans migration — ça
  déconnecte les sessions et vide les paniers en cours.
- **Les prix sont TTC.** `orders.tax` est la TVA *contenue* dans le total, jamais
  un supplément : ne pas l'additionner.
- **Les fonctions IA passent par la passerelle Lovable** (`LOVABLE_API_KEY`),
  aujourd'hui non configurée. Essai virtuel, chatbot et conseil de taille sont
  donc hors service.
