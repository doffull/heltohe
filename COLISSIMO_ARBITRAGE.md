# Colissimo international — fiche d'arbitrage

> Extrait de `COLISSIMO_INTERNATIONAL.md` (analyse du 11/09/2026), reformaté pour
> **décider**. Un problème par ligne, la solution proposée en face, une case à cocher.
>
> **Tout a été arbitré et codé le 14/09/2026.** Le code n'est en revanche **pas
> déployé** : lire « Reste à faire » avant de considérer le sujet clos.
>
> Vérifications de code refaites le 14/09/2026 — les références de fichiers ci-dessous
> ont été recontrôlées une par une, sauf mention contraire.

---

## Comment lire

| Colonne | Sens |
|---|---|
| **Gravité** | 🔴 bloquant · 🟠 dégât silencieux · 🟡 confort / dette |
| **Dépend du client** | Ce que je ne peux pas produire seul (codes douaniers, tarifs, arbitrage commercial) |
| **Effort** | Ordre de grandeur, hors validation |
| **Décision** | ☐ à trancher · ✅ go · ❌ écarté · ⏸️ plus tard |

---

## P1 — Le pays n'est jamais demandé à la cliente

| | |
|---|---|
| **Gravité** | 🔴 |
| **Preuve** | `src/pages/Checkout.tsx:157` → `country: 'France'`, figé. `form.country` n'est lié à aucun champ de saisie, seulement lu (l. 272, 313). |
| **Conséquence** | Toute commande étrangère est enregistrée « France ». Une cliente a tapé `Bussy.   Suisse` dans le champ **ville** pour se faire comprendre. |
| **Effort** | ~1 h |
| **Dépend du client** | non |

**Solution proposée** — un `<select>` pays alimenté par la table du plugin Colissimo,
positionné avant le code postal, avec validation du format de CP selon le pays choisi.

**Variante évoquée** : autocomplétion Google Maps. ⚠️ La clé actuelle passe par
`connector-gateway.lovable.dev`, la passerelle abandonnée qui a déjà cassé l'essai
virtuel (PROJECT.md §26.5). À rebasculer sur une clé Google directe **avant** d'en faire
dépendre le tunnel de commande. Le `<select>` suffit et n'a ni dépendance ni coût.

**Décision : ✅ go — implémenté le 14/09/2026** (`<select>` retenu, Google Maps écarté).

---

## P2 — L'étiquette déclare toujours `FR`

| | |
|---|---|
| **Gravité** | 🔴 |
| **Preuve** | `supabase/functions/create-colissimo-label/index.ts:238` → `countryCode: 'FR'` en dur dans le bloc `addressee`. `customer_country` n'est jamais lu. |
| **Conséquence** | Même une commande **corrigée à la main en admin** (`useOrders.ts:187` écrit bien `customer_country`) reste bloquée : Colissimo reçoit un colis français avec un CP suisse à 4 chiffres. Rejet. |
| **Effort** | ~1 h |
| **Dépend du client** | non |

**Solution proposée** — lire `order.customer_country`, le convertir en code ISO-2, le
transmettre. Fallback `FR` si vide, pour ne pas casser l'existant.

> ⚠️ **Correction de l'analyse initiale.** Le doc du 11/09 annonçait `countryCode` figé
> « dans **9 endroits** ». Recomptage du 14/09 : **4 occurrences littérales**, dont
> - `create-colissimo-label:228` → **expéditeur**, légitime (on expédie bien de France),
> - `create-colissimo-label:238` → **le vrai défaut**,
> - `colissimo-proxy:194` et `:212` → *valeurs par défaut de paramètre*, pas du dur ;
>   à rendre cohérentes mais ce n'est pas le blocage.
>
> **Le périmètre réel est donc plus petit qu'annoncé : un seul point de correction dur.**

**Décision : ✅ go — implémenté le 14/09/2026.** Un second point d'étiquetage a été
trouvé en cours de route dans `colissimo-proxy` (chemin SOAP, ligne 438) : lui aussi
déclarait `FR` en dur. Il est corrigé.

---

## P3 — Le point relais est proposé là où il n'existe pas

| | |
|---|---|
| **Gravité** | 🟠 |
| **Preuve** | Le mode relais est proposé sans condition de destination. Table du plugin : `"CH": { "pr": false }` — idem `CA`, `US`, `GB`. |
| **Conséquence** | La cliente choisit un mode de livraison impossible ; l'étiquette sera refusée à l'autre bout, après paiement. |
| **Effort** | ~1 h (dépend de P1 : il faut connaître le pays) |
| **Dépend du client** | non |

**Solution proposée** — masquer l'option relais quand `pr: false` pour le pays
sélectionné, et n'afficher que le domicile.

**Décision : ✅ go — implémenté le 14/09/2026.** Masqué au checkout, refusé par le
proxy de recherche de points relais, et refusé à l'étiquetage : trois verrous, parce
qu'une commande relais en Suisse n'est récupérable à aucun de ces trois stades.

---

## P4 — Le code produit ne s'adapte pas à la destination

| | |
|---|---|
| **Gravité** | 🟠 |
| **Preuve** | `create-colissimo-label/index.ts:177-181` → hors retour et hors relais, `productCode` vaut **toujours `DOM`**. `DOS` n'est jamais émis. |
| **Conséquence** | `DOM` est valide pour CH et BE, mais **DE, ES, IT, GB, US, CA n'acceptent que `DOS`** (avec signature). La commande de Montréal ne passera pas, même P1 et P2 corrigés. |
| **Effort** | ~2 h, avec la table |
| **Dépend du client** | non |

**Solution proposée** — importer tel quel le JSON du plugin WooCommerce
(`assets/misc/capabilitiesByCountryFR.json`) comme table de référence, et en dériver
`productCode`, la disponibilité du relais (P3) et l'obligation CN23 (P5). Une seule
source, pas une liste reconstituée à la main.

> 📌 **Point de méthode à conserver.** J'avais d'abord soutenu que `DOM` était réservé à
> la France et qu'il fallait un code international : **c'était faux**, Jessy a mis le
> raisonnement en doute et le plugin officiel lui a donné raison. Sur ce sujet : trancher
> sur la table officielle, jamais de mémoire.

**Décision : ✅ go — implémenté le 14/09/2026.** La table du plugin est embarquée telle
quelle et pilote `productCode`, le relais et la CN23.

---

## P5 — La déclaration douanière CN23 est absente

| | |
|---|---|
| **Gravité** | 🔴 **c'est ce qui débloque réellement la Suisse** |
| **Preuve** | `grep -i "hscode\|cn23\|origincountry"` sur `src/` et `supabase/` → **zéro résultat**. Rien n'existe. |
| **Conséquence** | Pour `CH`, le plugin officiel génère **toujours** la CN23 (`getIsCn23RequiredForDestination` = `true`). Sans elle, **aucune étiquette suisse ne sortira**, P1 à P4 corrigés ou non. |
| **Effort** | ~1 j de code, **mais bloqué en amont par les données** |
| **Dépend du client** | 🔴 **oui — codes douaniers** |

Ce qu'il faut, par article :

| Champ | Disponible ? |
|---|---|
| `description`, `quantity`, `value`, `currency` | ✅ déjà dans `order.items` |
| `weight` | ✅ poids produit, déjà utilisé pour l'étiquette |
| `artref` | ✅ le SKU |
| **`hsCode`** (code douanier SH) | ❌ **manquant** — attribut produit à créer |
| **`originCountry`** (pays de fabrication) | ❌ **manquant** — idem |

**Décision : ✅ go — tranché le 14/09/2026. P5 n'est plus bloqué.**

### Ce qui a débloqué la situation

Le plugin officiel ne réclame **pas** une saisie produit par produit : il lit un attribut,
et **retombe sur une valeur par défaut globale** si l'attribut est vide
(`LabelGenerationPayload.php:1123-1144`, options `lpc_customs_defaultHsCode` et
`lpc_default_country_for_product`). Deux réglages admin suffisent donc à faire sortir une
étiquette — l'affinage par produit peut venir plus tard.

**P5 passe ainsi de « 1 j + délai fournisseur » à « faisable immédiatement ».**

### Valeurs retenues

| Champ | Valeur | Origine de la décision |
|---|---|---|
| `originCountry` | **`CN`** | Jessy, 14/09 — fabrication Chine |
| `hsCode` | **vide** | Jessy, 14/09 — voir la réserve ci-dessous |
| `description` | nom du produit, **désaccentué**, tronqué 64 car. | contrainte API |
| `artref` | SKU tronqué 44 car. | contrainte API |

### ⚠️ Réserve consignée sur le code SH vide

Décision assumée par le client. Ce qui a été exposé avant l'arbitrage :

- **Techniquement, ce n'est pas bloquant** — le plugin envoie `hsCode` sans aucune
  validation, même vide (`LabelGenerationPayload.php:914`). L'étiquette devrait sortir.
- **Réglementairement, le code est exigé** — depuis le 01/01/2021, tout envoi hors UE doit
  être accompagné de données douanières électroniques préalables (ITMATT/EAD), code SH
  compris. C'est la douane de destination qui l'impose, pas Colissimo.
- **Risque encouru** : colis retenu, taxé au taux le plus défavorable, ou retourné — après
  expédition, donc transport payé deux fois.
- Le code retenu si besoin était **`620240`** (doudoune, enveloppe synthétique, positions
  « femmes » — note 9 du ch. 62 : un vêtement non identifiable homme/femme s'y classe).

**Mitigation implémentée** : `hsCode` est codé comme **réglage admin surchargeable par
produit**, valeur par défaut vide — et non en dur. Si un envoi réel est rejeté, la valeur
se saisit dans l'admin sans redéploiement.

### ⚠️ Deux pièges API relevés dans le plugin

1. **Aucun accent** dans la description article — l'API renvoie une erreur
   (`Helper::replaceAccents` appliqué systématiquement). « Doudoune matelassée » casse
   l'appel.
2. **Troncatures** : description 64 caractères, `artref` 44.

---

## P0 — Les 4 commandes payées, aujourd'hui

| | |
|---|---|
| **Gravité** | 🔴 immédiat, argent déjà encaissé |
| **Effort** | 0 — aucun code |

`HMP-MTVEO78Y` (214,67 €) · `HMP-MTVTXC5P` (114 €) · `HMP-MTVW5TB1` (214 €) ·
`HMP-MTVWZVYS` (184 €) — **727 € encaissés, non expédiés.**

**Solution proposée** — les expédier depuis l'espace professionnel La Poste / Colissimo,
qui gère l'international et la CN23. Indépendant de tout ce qui précède, faisable
aujourd'hui.

**Décision : ☐**

---

## P6 — Frais de port forfaitaires : vente à perte probable

| | |
|---|---|
| **Gravité** | 🟠 |
| **Preuve** | `src/hooks/useCheckoutConfig.ts` → `shippingHomePrice: 15`, `shippingRelayPrice: 4.5`, `freeShippingThreshold: 99`. **Aucune notion de zone.** |
| **Conséquence** | Un envoi CH (Z3) ou CA (Z5) coûte nettement plus de 15 € ; au-delà de 99 € il est **offert**. Les commandes étrangères sont probablement vendues à perte. |
| **Effort** | ~0,5 j |
| **Dépend du client** | ✅ **tranché le 14/09/2026** |

~~Solution proposée — grille de frais de port par zone.~~ **Écartée.**

**Décision : ✅ — règle arbitrée par Jessy, 14/09/2026**

> **La TVA reste telle quelle. Dès que le pays ≠ France, ajouter un forfait douane
> de 40 €, identique pour tous les pays.**

Ce que cela veut dire concrètement :

| | |
|---|---|
| Déclencheur | `country !== 'FR'` — **pas** de distinction de zone, CH comme CA comme BE |
| Montant | **40 € TTC**, forfaitaire, par commande |
| TVA | **inchangée** — pas de recalcul, pas de ventilation, pas d'exonération hors UE |
| Port | **remplacé**, pas additionné |

**Une grille par zone n'est plus à faire** — le forfait unique la remplace. C'est plus
simple à coder et plus simple à expliquer à la cliente.

### Les trois points, tranchés le 14/09/2026

1. **Cumul avec le port → ❌ non. 40 € tout compris.** Le forfait **remplace** les frais
   de port, il ne s'y ajoute pas. Une commande suisse paie **40 €**, pas 55 €.
2. **Franco de port à 99 € → ❌ ne s'applique pas hors France.** Le franco reste réservé
   à la France. Hors France, les 40 € sont **toujours dus**, quel que soit le montant du
   panier. `HMP-MTVEO78Y` (214 €) paierait donc bien 40 €.
3. **TVA sur les 40 € → ✅ TTC**, comme tout le reste du site. Les 40 € entrent dans le
   total TTC et dans le calcul de `orders.tax` existant (TVA *contenue*, jamais ajoutée).

### Règle finale, sous une forme codable

```
si country === 'FR'
    → logique actuelle inchangée
      (domicile 15 € · relais 4,50 € · franco à 99 €)

sinon
    → 40 € TTC, forfaitaire
      · remplace le port, ne s'y ajoute pas
      · quel que soit le mode de livraison
      · quel que soit le montant du panier — aucun franco
      · quel que soit le pays — aucune zone
```

⚠️ **À vérifier à l'implémentation** : le seuil de franco est évalué **deux fois**, côté
client (`Checkout.tsx`, via `computeShippingCost`) *et* côté serveur (RPC
`validate_and_create_order`). PROJECT.md insiste sur le fait que les deux doivent donner
le même résultat. **La règle des 40 € doit être posée des deux côtés**, sinon le montant
affiché et le montant enregistré divergeront.

### Nommage — tranché le 14/09/2026

**Libellé retenu : « Supplément d'expédition internationale ».**

Pourquoi pas « frais de douane » : les vrais droits seront **quand même réclamés à la
cliente par le transporteur à la réception** (on n'est pas en DDP, cf. P5 — aucune
déclaration n'est transmise). Le mot « douane » lui promet implicitement que c'est réglé ;
elle paierait **deux fois** en apparence et se retournerait vers la boutique.

Ce libellé est celui affiché au checkout, dans le récapitulatif de commande, dans l'e-mail
de confirmation et sur la facture. **Aucune occurrence du mot « douane » côté cliente.**

**Décision nommage : ✅ B**

---

## P7 — Sujets écartés par le client, conservés pour mémoire

| Sujet | Statut | Pourquoi c'est noté quand même |
|---|---|---|
| **TVA** | ❌ **écarté, reconfirmé le 14/09/2026** — « la TVA reste telle quelle » | PROJECT.md §24.1 signale déjà qu'elle n'est ventilée nulle part. Les prix sont TTC et `orders.tax` est la TVA *contenue*. |
| **Information douanière à la cliente** | ⚠️ **à rouvrir** | Devient plus sensible avec le forfait de 40 € : voir la réserve de nommage en P6. Hors UE, elle paiera **en plus** à la réception. Risque de litige, pas risque technique. |

**Décision : ☐** (confirmer que l'information douanière reste écartée malgré P6)

---

## Implémentation — 14/09/2026

Tout ce qui suit est écrit et compile (`tsc`, `vite build`, 22 tests) mais **n'est
pas encore en ligne** : voir « Reste à faire » en fin de section.

| Fichier | Rôle |
|---|---|
| `src/data/colissimo-capabilities.json` | Table officielle du plugin WooCommerce — 251 pays, 10 zones. **Source unique.** |
| `scripts/generate-colissimo-capabilities.mjs` | Dérive la table en TypeScript pour le front *et* pour Deno. À relancer si La Poste met le JSON à jour. |
| `src/lib/colissimo-capabilities.ts` · `supabase/functions/_shared/colissimo-capabilities.ts` | **Générés — ne pas éditer.** |
| `src/lib/colissimo-countries.ts` | Noms de pays, validation du code postal, normalisation ISO (front). |
| `supabase/functions/_shared/colissimo-countries.ts` | Idem côté edge functions — Vite et Deno ne partagent aucun chemin d'import. |
| `src/pages/Checkout.tsx` | Sélecteur de pays, CP validé selon la destination, forfait affiché, relais masqué. |
| `src/hooks/useCheckoutConfig.ts` | `computeShippingCost` prend le pays ; forfait international. |
| `supabase/migrations/20260914100000_expedition_internationale.sql` | Colonnes de config + RPC `validate_and_create_order` alignée. |
| `supabase/functions/create-colissimo-label/index.ts` | `countryCode` réel, code produit selon le pays, **bloc CN23**. |
| `supabase/functions/colissimo-proxy/index.ts` | Même logique sur le second chemin d'étiquetage. |
| `src/pages/admin/AdminCheckout.tsx` | Réglage du forfait international. |
| `src/pages/admin/AdminColissimo.tsx` | Réglages douaniers (code SH, pays de fabrication). |
| `src/pages/admin/AdminOrders.tsx` | Le pays d'une commande devient une liste, non plus un champ libre. |
| `src/lib/__tests__/colissimo-countries.test.ts` | 22 tests sur les règles arbitrées. |

### Décisions d'implémentation qui méritent d'être connues

- **Le code SH est omis du payload plutôt qu'envoyé vide.** Une chaîne vide est un
  code invalide ; une absence est une donnée manquante. Nuance qui peut changer la
  réaction de la douane.
- **Un code promo « livraison offerte » n'annule pas le forfait international.** Il
  couvre un envoi France, pas le surcoût d'un envoi hors frontière. Sans cette
  réserve, la règle des 40 € se contournait avec un code promo.
- **Les libellés historiques sont reconnus** (« France », « Suisse »…). Sans cela,
  les 15 commandes déjà en base repartaient toutes en `FR`.
- **Le pays est normalisé à l'enregistrement** : `orders.customer_country` contient
  désormais un code ISO, y compris quand le front envoie un libellé.
- **L'étiquetage refuse explicitement** une destination non desservie ou un point
  relais impossible, au lieu de laisser Colissimo répondre une erreur opaque.

### ⚠️ Reste à faire — hors de ma portée

1. **Appliquer la migration** : `supabase db push`. Rien ne fonctionne avant
   (colonnes absentes ⇒ forfait figé à sa valeur par défaut, RPC inchangée).
2. **Déployer les trois edge functions** : `create-colissimo-label`,
   `colissimo-proxy`, et `_shared` qu'elles embarquent. Le §18 du PROJECT.md
   rappelle que le dépôt n'est pas le déploiement.
3. **Tester sur une vraie commande suisse** avant de rouvrir la vente à
   l'international — c'est le seul moyen de savoir si le code SH vide passe.
4. **P0** : expédier les 4 commandes payées depuis l'espace professionnel La Poste.

---

## Récapitulatif à trancher

| # | Problème | Gravité | Client ? | Effort | Décision |
|---|---|---|---|---|---|
| **P0** | 4 commandes payées, 727 € non expédiés | 🔴 | — | 0 | ☐ |
| **P1** | Pays jamais demandé au checkout | 🔴 | non | 1 h | **✅ codé** |
| **P2** | `countryCode: 'FR'` en dur sur l'étiquette | 🔴 | non | 1 h | **✅ codé** |
| **P3** | Point relais proposé là où `pr: false` | 🟠 | non | 1 h | **✅ codé** |
| **P4** | `productCode` toujours `DOM`, jamais `DOS` | 🟠 | non | 2 h | **✅ codé** |
| **P5** | CN23 absente — **débloque la Suisse** | 🔴 | ✅ tranché | 1 j | **✅ codé** |
| **P6** | Forfait douane 40 € si pays ≠ FR | 🟠 | ✅ tranché | 0,5 j | **✅ codé** |
| **P7** | TVA inchangée · info douanière à rouvrir | 🟡 | oui | — | ☐ |

**Lecture d'ensemble.** P1→P4 (≈ 5 h, aucune dépendance) **arrêtent l'hémorragie** : plus
aucune commande étrangère mal enregistrée. Ils ne débloquent **pas** la Suisse — seul P5
le fait, et P5 attend les codes douaniers. P0 est indépendant et peut partir aujourd'hui.
