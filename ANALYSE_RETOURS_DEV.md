# Analyse des retours du dev — 09/09/2026

Qualification de chaque point : **bug** (ça devrait marcher et ça ne marche pas),
**évolution** (ça marche, on veut mieux), **nouvelle fonctionnalité** (ça n'existe pas).

Analyse faite sur le dépôt `prod` (`826065d8`) et sur la base de production
`hzjzqdlyehclnpeqkier`.

| # | Point | Nature | Charge |
|---|---|---|---|
| 1 | Essai virtuel | 🐞 Bug — configuration | XS |
| 2 | Roulette — visuel mobile | 🐞 Bug — à reproduire | S |
| 3 | Roulette — vrai code promo | ✅ Déjà fait | — |
| 4 | Roulette — mode test admin | ✨ Nouvelle fonctionnalité | S |
| 5 | Scroll bloqué (suivi commandes) | 🐞 Bug | XS |
| 6 | Actions en masse (préparation) | ✨ Nouvelle fonctionnalité | M |
| 7 | Synchronisation des statuts | 🐞 Bug | XS |
| 8 | Paniers abandonnés — relance | ✨ Nouvelle fonctionnalité | M |
| 9 | Import massif bloqué à 1 000 | 🐞 Bug | S |
| 10 | Messagerie — Resend + webhook entrant | 🔀 Évolution | L |
| 11 | Messagerie — deux canaux | ✨ Nouvelle fonctionnalité | M |
| 12 | Upload direct des médias | 🔀 Évolution | S |
| 13 | Espace Live — temps réel | 🔀 Évolution | S |
| 14 | Statistiques — CA & conversion | 🐞 Bug | M |

---

## 1. Boutique / Côté client

### 1. Essai virtuel (doudounes & mannequin) — 🐞 Bug de configuration

Pas un problème de code : le secret `LOVABLE_API_KEY` n'est pas configuré sur le
projet Supabase. La fonction refuse dès sa première ligne (`virtual-tryon/index.ts:152`).
Vérifié en production : `POST /functions/v1/virtual-tryon` → `500 {"error":"LOVABLE_API_KEY missing"}`.

Le « chargement infini » est un second bug, celui-là bien dans le code : le front
ne traite pas la réponse non-2xx et laisse le spinner tourner.

⚠️ `ai.gateway.lovable.dev` est la passerelle **Lovable**, quittée au §21 pour raison
de coût. Si l'abonnement est résilié, il faut basculer sur l'API Gemini directe —
ce qui touche aussi les 5 autres fonctions IA.

Désactiver en attendant coûte une requête : `update products set tryon_mode = 'none'`.

### 2. Mini-jeu roulette — trois demandes distinctes

**a) Bugs visuels responsive — 🐞 Bug, à reproduire.**
La roue est déjà responsive : `RouletteWheel.tsx` redimensionne via un `ResizeObserver`
et un conteneur `w-full aspect-square`. Le défaut n'est donc pas structurel. Il faut
la capture d'écran et le modèle de téléphone pour trancher.

**b) Lier l'arrêt de la roue à la création d'un vrai code promo — ✅ Déjà fait.**
`spin_roulette` insère déjà un vrai enregistrement dans `promo_codes` (code préfixé,
`usage_limit = 1`, `expires_at` calculé) et le relie au spin. Rien à développer.

⚠️ Mais un risque réel existe : la version de `validate_and_create_order` **présente
dans le dépôt** ignore `usage_limit` et `max_discount`. Le jour où elle sera déployée,
tout code roulette deviendra réutilisable à l'infini et sans plafond. À traiter avant.

**c) Mode test dans l'admin — ✨ Nouvelle fonctionnalité.**
`AdminRoulette` n'a que trois onglets : Configuration, Lots, Historique. Aucun moyen
de tirer sans consommer un vrai spin ni générer un vrai code.

---

## 2. Gestion des commandes (Admin)

### 3. Scroll bloqué — 🐞 Bug confirmé

`AdminOrderTracking.tsx:230` : `<ScrollArea className="max-h-[70vh]">`. Le viewport
Radix est en `h-full`, qui ne résout à rien face à un parent en `max-height` sans
hauteur. Résultat : la liste est coupée à 70 vh, sans barre de défilement.

Correctif : passer en `h-[70vh]`. Une ligne.

### 4. Actions en masse (préparation) — ✨ Nouvelle fonctionnalité

`AdminPreparations` n'assigne qu'une commande à la fois (`assignMutation`). Ni cases
à cocher, ni sélection multiple. Le hook `useBulkSelection` existe déjà et est utilisé
ailleurs (`AdminCustomers`, `AdminOrders`) : il y a un modèle à reprendre.

### 5. Synchronisation des statuts — 🐞 Bug confirmé

`AdminOrderTracking.tsx:48` déclare `STATUS_STEPS = ['pending','paid','processing','shipped','delivered']`.
Or `orders.status` n'accepte que `Pending, Processing, Shipped, Delivered, Cancelled` —
**`Paid` n'existe pas sur `status`**, c'est une valeur de `payment_status`.

Conséquence : la carte « Payée » affiche toujours 0, et « Annulée » n'a pas de carte.
Vérifié en base : 72 commandes, `status` = {Pending 56, Shipped 15, Processing 1},
`payment_status` = {Pending 56, Paid 16}.

Second point : la liste est plafonnée à `.limit(400)`. Sans effet aujourd'hui, à revoir
avant que le volume ne monte.

### 6. Paniers abandonnés — relance e-mail — ✨ Nouvelle fonctionnalité

L'onglet existe (`AdminOrders.tsx:181`, scope `abandoned`) mais n'offre qu'une purge
des paniers de plus de 24 h. Aucune relance. Tout est à écrire : bouton, gabarit
d'e-mail, et l'automatisation si elle est voulue.

---

## 3. Base clients & CRM (Admin)

### 7. Import massif bloqué à 1 000 — 🐞 Bug confirmé

Le diagnostic du dev vise à côté : **l'import lui-même est correct**, il découpe en
lots de 100 pour l'upsert et de 200 pour la vérification d'existence
(`CustomerImportDialog.tsx:130-152`).

Le vrai coupable est l'**affichage** : `useCustomers.ts:44-47` fait un `select('*')`
sans `.range()`. PostgREST plafonne à 1 000 lignes. Vérifié en base :
`content-range: 0-999/6328` — 6 328 clients existent, 1 000 sont affichés.

Correctif : pagination côté serveur, ou récupération par tranches successives.
Note : 6 328 clients en base, pas 30 000 — à confirmer si l'import est bien passé en entier.

### 8. Messagerie — Resend + webhook entrant — 🔀 Évolution

`AdminMessagerie` existe (806 lignes) et permet déjà de choisir le fournisseur
(`resend` / `brevo`) et de saisir la clé. L'**envoi** est en place
(`crm-send-message`, `send-custom-email`).

Ce qui manque, c'est la **réception** : aucun webhook entrant, aucune table de messages
reçus. C'est la moitié manquante d'une fonctionnalité existante.

### 9. Deux canaux distincts (support client / chat interne) — ✨ Nouvelle fonctionnalité

Aucune notion de canal aujourd'hui. Suppose un modèle de données à créer, et dépend
du point 8 pour le canal support.

---

## 4. Marketing & Bannières (Admin)

### 10. Upload direct des médias — 🔀 Évolution

`AdminMarketing.tsx:77` expose un champ texte « Image URL » avec aperçu. Le mécanisme
d'upload existe déjà ailleurs (`AdminDesign.tsx:1653`, `supabase.storage.from('media').upload`) :
il s'agit de le réutiliser ici, pas de le créer.

⚠️ Prérequis levé le 08/09 : les policies RLS de `storage.objects` étaient absentes,
tout upload échouait. Corrigé par la migration `20260908124500`. À vérifier que la
correction est bien appliquée avant de chiffrer ce point.

Le MP4 demandé est déjà autorisé par le bucket (`video/mp4`, `video/webm`, 100 Mo max).

---

## 5. Live & Analytics (Admin)

### 11. Espace Live — temps réel — 🔀 Évolution

`AdminLive` rafraîchit déjà, par sondage toutes les 8-10 s. Le vrai temps réel
Supabase a été **volontairement désactivé** — commentaire `AdminLive.tsx:45` :
*« realtime disabled for PII protection »*.

À arbitrer avant de développer : c'est une décision antérieure, pas un oubli.

### 12. Statistiques — 🐞 Bug confirmé sur les calculs

Sur la fiabilité du CA, deux défauts certains dans `useAnalyticsData.ts` :

- `discount = subtotal + shipping − total` (l. 80) vaut **toujours 0**, car
  `orders.subtotal` est déjà stocké net de remise. Aucune remise ne sera jamais vue.
- `promoCode` est cherché par expression régulière dans `orders.notes` (l. 74), où
  **rien ne l'écrit jamais**. L'attribution par code promo est structurellement vide.

Ajouter : tant qu'il y a moins de 10 commandes payées, la page bascule en **mode démo**
et affiche des données fabriquées (l. 233). Avec 16 commandes `Paid` en base, ce n'est
plus le cas — mais c'est à savoir avant de conclure qu'un chiffre est faux.

Les « bugs d'affichage des graphiques » (Recharts) ne sont pas qualifiables sans
capture : à demander.

---

## Points à clarifier avec le dev

1. **Roulette, bugs visuels** — capture + modèle de téléphone.
2. **Graphiques** — quels écrans, quel symptôme.
3. **30 000 clients** — la base en compte 6 328. L'import est-il passé en entier ?
4. **Compteurs 14 / 52** — chiffres non reproduits aujourd'hui (72 commandes en base).
   Le mécanisme du point 5 explique l'écart, mais la capture confirmerait.

## Ce que le dev n'a pas vu

Trois défauts de facturation relevés lors de l'audit du 08/09, absents de sa liste
et plus graves que la majorité de ses points :

- Enregistrer une commande remisée depuis l'admin **regonfle le total** de la remise
  (`AdminOrders.tsx:572`) — la facture ne correspond plus à l'encaissement.
- La remise n'est stockée nulle part : ni le code, ni le montant.
- La version de `validate_and_create_order` présente dans le dépôt a perdu
  `usage_limit`, `max_discount` et l'incrément de `usage_count`. Non déployée à ce
  jour — donc sans effet, mais c'est une bombe à retardement.
