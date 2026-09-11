# Expéditions hors France — analyse du blocage Colissimo

> **Statut : analysé, non corrigé.** Rien n'a été modifié dans le code.
> Analyse du 11/09/2026, en attente d'arbitrage client.
> Signalement d'origine : *« Je ne peux pas expédier les commandes en Suisse —
> problème Colissimo »*, avec 4 numéros de commande.

---

## 1. Ce n'est pas Colissimo

Le transporteur refuse, mais il a raison de refuser : on lui transmet une
commande incohérente. Le défaut est entièrement de notre côté, et il est
**double** — deux causes indépendantes, qui doivent toutes deux être corrigées.

| # | Défaut | Fichier |
|---|---|---|
| **A** | Le pays n'est **jamais demandé** à la cliente | `src/pages/Checkout.tsx:157` |
| **B** | L'étiquette déclare **toujours `FR`** à Colissimo | `supabase/functions/create-colissimo-label/index.ts:238` |

### A — le pays est figé à « France »

```js
// src/pages/Checkout.tsx:157
country: 'France',
```

`form.country` n'est **lié à aucun champ de saisie**. Il n'est que *lu*, pour
être enregistré (lignes 272 et 313). Aucune cliente ne peut donc déclarer un
autre pays, où qu'elle habite.

La preuve est dans les données : une cliente a tapé `Bussy.   Suisse` dans le
champ **ville** pour se faire comprendre, faute de champ « pays ».

### B — l'étiquette part toujours pour la France

```js
// supabase/functions/create-colissimo-label/index.ts:238
addressee: { address: { …, countryCode: 'FR' } }
```

Même une commande dont le pays a été **corrigé à la main** en admin
(`src/hooks/useOrders.ts:187`) reste bloquée : la fonction d'étiquetage ignore
`customer_country` et envoie `FR` en dur. Colissimo reçoit donc un colis
français avec un code postal suisse à 4 chiffres — format invalide en France,
qui en exige 5. Rejet.

⚠️ `countryCode` est figé à `'FR'` dans **9 endroits** du code Colissimo
(`colissimo-proxy`, `_shared/colissimo.ts`, `create-colissimo-label`).

---

## 2. Ce que j'avais affirmé à tort

J'ai d'abord soutenu que le code produit `DOM` était réservé à la France et
qu'il fallait un code international. **C'était faux.** Jessy a mis le
raisonnement en doute, et le plugin WooCommerce officiel lui a donné raison.

La table de référence du plugin
(`assets/misc/capabilitiesByCountryFR.json`, magasin expédiant de France) :

```json
"CH": { "domiciless": "DOM", "domicileas": "DOS",
        "pr": false, "cn23": true, "insurance": true }
```

**`DOM` est valide pour la Suisse.** Le code produit ne décrit pas l'origine du
colis — tous les produits Colissimo partent de France — mais **la prestation
rendue à destination**.

Leçon à retenir : sur ce sujet, trancher sur la table officielle du plugin,
jamais de mémoire.

---

## 3. La table officielle (source : plugin WooCommerce 3.1.1)

Expédition **depuis la France** :

| Pays | Zone | Sans signature | Avec signature | Point relais | CN23 |
|---|---|---|---|---|---|
| FR | ZFR | `DOM` | `DOS` | ✅ | non |
| **CH** | **Z3** | **`DOM`** | `DOS` | **❌** | **oui** |
| BE | Z1 | `DOM` | `DOS` | ✅ | non |
| MC | ZFR | `DOM` | `DOS` | ✅ | non |
| DE, LU | Z1 | ❌ | `DOS` | ✅ | non |
| ES, IT | Z2 | ❌ | `DOS` | ✅ | non |
| GB | Z2 | ❌ | `DOS` | ❌ | oui |
| **CA** | **Z5** | **❌** | `DOS` | ❌ | oui |
| US | Z5 | ❌ | `DOS` | ❌ | oui |

Trois enseignements que la seule correction du pays ne couvre pas :

1. ⚠️ **`pr: false`** — pas de point relais en Suisse ni au Canada. Si la
   cliente choisit ce mode, l'étiquette sera refusée : il faut le masquer en
   amont selon la destination.
2. ⚠️ **`domiciless: false`** pour DE, ES, IT, GB, US, **CA** — ces pays
   n'acceptent **que `DOS`** (avec signature). La commande de Montréal ne
   passera donc pas en `DOM`, contrairement à la Suisse.
3. ⚠️ **`cn23: true`** pour CH, GB, US, CA — déclaration douanière obligatoire.

Le JSON complet du plugin est la source à reprendre, plutôt qu'une liste
reconstituée à la main.

---

## 4. La déclaration douanière n'est pas optionnelle

Décision côté client : « on ne s'en occupe pas pour le moment ». Il faut
néanmoins que ce soit écrit ici — **ce n'est pas un choix commercial, c'est un
champ que l'API réclame.** Le plugin officiel commence par :

```php
if (!$this->capabilitiesPerCountry->getIsCn23RequiredForDestination($order)) return $this;
```

Pour `CH`, `getIsCn23Required` vaut `true` : il génère **toujours** la
déclaration. Sans elle, aucune étiquette suisse ne sortira, quelles que soient
les corrections A et B.

Structure attendue, par article :

| Champ | Disponible ? |
|---|---|
| `description`, `quantity`, `value`, `currency` | ✅ déjà dans `order.items` |
| `weight` | ✅ poids produit, déjà utilisé pour l'étiquette |
| `artref` | ✅ le SKU |
| **`hsCode`** (code douanier) | ❌ **manquant** — attribut produit à créer |
| **`originCountry`** (pays de fabrication) | ❌ **manquant** — idem |

Il ne manque donc que **deux attributs produit**. Pour du prêt-à-porter le code
SH est souvent commun à toute une famille (doudounes ≈ `6201…`) : saisie unique,
pas un chantier. **C'est néanmoins le préalable le plus long à obtenir** — il
dépend du fournisseur ou du transitaire.

---

## 5. Les commandes concernées

Revue des **157 dernières commandes**, filtrées sur un code postal non conforme
au format français (5 chiffres) : **15 commandes**.

⚠️ **Seules 4 sont payées** — exactement celles signalées par le client. Les 11
autres sont en `Pending` de paiement : ce ne sont pas des ventes perdues au sens
comptable, mais elles témoignent d'une demande étrangère réelle, et certaines
sont peut-être des abandons **causés** par ce défaut.

| Commande | CP | Ville | Pays enregistré | Statut | Paiement | Total |
|---|---|---|---|---|---|---|
| `HMP-MTUGGWQ7` | 1632 | Riaz | France | Pending | Pending | 194 € |
| `HMP-MTUVV6J5` | 7260 | La Crèche | France | Pending | Pending | 194 € |
| `HMP-MTUVYKNZ` | 7260 | La Crèche | France | Pending | Pending | 194 € |
| `HMP-MTVBVPAY` | 1893 | Muraz (Collombey) | France | Pending | Pending | 184 € |
| **`HMP-MTVEO78Y`** | 2015 | Areuse | **Suisse** | Processing | **Paid** | 214,67 € |
| `HMP-MTVHJDZM` | 2400 | Le Locle | France | Pending | Pending | 184 € |
| `HMP-MTVHJJQ8` | 2400 | Le Locle | France | Pending | Pending | 184 € |
| `HMP-MTVHJKUX` | 2400 | Le Locle | France | Pending | Pending | 184 € |
| `HMP-MTVTL1BT` | 1541 | Bussy | France | Pending | Pending | 114 € |
| `HMP-MTVTOU6I` | 1541 | Bussy | France | Pending | Pending | 114 € |
| **`HMP-MTVTXC5P`** | 1541 | `Bussy.   Suisse` | France | Processing | **Paid** | 114 € |
| **`HMP-MTVW5TB1`** | 2300 | La Chaux-de-Fonds | France | Processing | **Paid** | 214 € |
| **`HMP-MTVWZVYS`** | 3977 | Granges | France | Processing | **Paid** | 184 € |
| `HMP-MTVXYXXC` | 1950 | Sion | France | Pending | Pending | 184 € |
| **`HMP-MTWC73RZ`** | **H2G 2Y6** | **Montréal (Canada)** | France | Pending | Pending | 194 € |

`HMP-MTVEO78Y` est la seule dont le pays affiche « Suisse » : le client l'a
corrigée à la main en admin. Elle reste bloquée — c'est la démonstration que le
défaut B existe indépendamment du défaut A.

---

## 6. Plan de correction proposé

| # | Action | Dépend du client ? |
|---|---|---|
| 1 | **Sélecteur de pays au checkout** — corrige A à la racine | non |
| 2 | **`countryCode` dynamique** + code produit issu de la table du plugin | non |
| 3 | **Masquer le point relais** quand `pr: false` pour la destination | non |
| 4 | Attributs produit `hsCode` + `originCountry`, puis génération du bloc CN23 | **oui** — codes douaniers |

Les points 1 à 3 sont rapides et **arrêtent l'hémorragie** : plus aucune
nouvelle commande étrangère ne sera mal enregistrée. Ils ne suffisent pas à
débloquer la Suisse — le point 4 est indispensable pour cela.

**Solution immédiate pour les 4 commandes payées** : les expédier depuis
l'espace professionnel La Poste / Colissimo, qui gère l'international et la
CN23. Indépendant du code, faisable aujourd'hui.

---

## 7. Questions ouvertes, hors périmètre technique

- 🔴 **Frais de port forfaitaires à 15 €**, sans zone
  (`useCheckoutConfig.ts:54`). Un envoi en Suisse ou au Canada coûte nettement
  plus cher : ces commandes sont probablement **vendues à perte**.
- **TVA** — écarté par le client (« pas pour le particulier »). Pour mémoire,
  §24.1 du PROJECT.md signale déjà qu'elle n'est ventilée nulle part.
- **Information douanière à la cliente** — écarté par le client. Hors UE, elle
  paiera des frais à la réception ; ce n'est mentionné nulle part sur le site.
- **Google Maps au checkout** (évoqué) : réglerait A par effet de bord et
  validerait le couple code postal / pays. Mais ⚠️ la clé actuelle passe par
  `connector-gateway.lovable.dev`, la passerelle abandonnée qui a déjà cassé
  l'essai virtuel (§26.5). À rebasculer sur une clé Google directe avant d'en
  faire dépendre le tunnel de commande. Un simple `<select>` pays suffit pour
  corriger A, sans dépendance ni coût.
