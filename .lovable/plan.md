

## Plan : Passerelles de paiement e-commerce + Personnalisation carte Points Relais

### 1. Refonte de l'onglet Paiement dans AdminCheckout

Remplacer la liste simple de moyens de paiement par un catalogue de **passerelles e-commerce pré-configurées** :

**Passerelles incluses :**
- **Stripe** — Cartes, Apple Pay, Google Pay
- **PayPlug** — Solution française, cartes bancaires
- **Mollie** — Multi-méthodes (CB, iDEAL, Bancontact, etc.)
- **Klarna** — Paiement en 3x/4x, pay later
- **PayPal** — Paiement en ligne classique
- **Virement bancaire** — Manuel (existant)

Chaque passerelle aura :
- Un toggle on/off
- Un champ pour la clé API publique (publishable key)
- Un champ pour la clé API secrète (secret key) — stocké via les secrets backend
- Un indicateur de statut (configuré / non configuré)
- Un lien vers la documentation du fournisseur

Les clés secrètes seront sauvegardées dans `checkout_config.payment_methods` (JSONB enrichi). Les clés réellement sensibles (secret keys) seront stockées côté serveur uniquement via les secrets Supabase lorsque l'utilisateur les configurera.

**Structure JSONB enrichie pour `payment_methods` :**
```json
[
  { "key": "stripe", "label": "Stripe", "enabled": false, "publicKey": "", "configured": false },
  { "key": "payplug", "label": "PayPlug", "enabled": false, "publicKey": "", "configured": false },
  { "key": "mollie", "label": "Mollie", "enabled": false, "publicKey": "", "configured": false },
  { "key": "klarna", "label": "Klarna", "enabled": false, "publicKey": "", "configured": false },
  { "key": "paypal", "label": "PayPal", "enabled": false, "publicKey": "", "configured": false },
  { "key": "bank_transfer", "label": "Virement bancaire", "enabled": true, "configured": true }
]
```

### 2. Personnalisation de la carte Points Relais dans AdminColissimo

Ajouter un onglet ou une section dans l'onglet "Points Relais" de `AdminColissimo.tsx` pour personnaliser l'apparence de la carte Leaflet :

- Couleur des marqueurs (couleur primaire du marqueur sélectionné, couleur des marqueurs standards)
- Style de la carte (tile layer : clair/sombre/standard)
- Zoom par défaut
- Rayon de recherche par défaut

Ces paramètres seront stockés dans `checkout_config` via un nouveau champ JSONB `relay_map_settings`.

### 3. Migration SQL

Ajouter la colonne `relay_map_settings` (JSONB) à la table `checkout_config` avec un défaut raisonnable.

### 4. Intégration dans le checkout client

Modifier `Checkout.tsx` pour lire `relay_map_settings` et appliquer le style de carte choisi par l'admin lors de la sélection de point relais (si une carte Leaflet y est ajoutée ultérieurement).

### Fichiers modifiés/créés

| Fichier | Action |
|---|---|
| Migration SQL | Ajouter `relay_map_settings` à `checkout_config` |
| `src/hooks/useCheckoutConfig.ts` | Enrichir le type `PaymentMethod` + mapper `relay_map_settings` |
| `src/pages/admin/AdminCheckout.tsx` | Refonte onglet Paiement avec catalogue passerelles |
| `src/pages/admin/AdminColissimo.tsx` | Section personnalisation carte dans onglet Points Relais |

