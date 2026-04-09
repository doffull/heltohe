

## Plan : Espace Admin "Commandes & Livraison"

### Contexte
Les tarifs Colissimo sont actuellement codés en dur dans `Checkout.tsx` (`home: 6.5€`, `relay: 4.5€`, `seuil: 200€`). Il n'existe aucun espace admin pour gérer le tunnel d'achat.

### 1. Nouvelle table `checkout_config` en base de données

Migration SQL pour stocker tous les paramètres configurables du checkout :
- `shipping_home_price` (NUMERIC, défaut 6.50)
- `shipping_relay_price` (NUMERIC, défaut 4.50)  
- `free_shipping_threshold` (NUMERIC, défaut 200)
- `payment_methods` (JSONB — liste des modes de paiement activés avec labels)
- `checkout_message` (TEXT — message personnalisé affiché sur la page de confirmation)
- `relay_enabled` (BOOLEAN, défaut true)
- `home_delivery_enabled` (BOOLEAN, défaut true)
- RLS : admin-only pour write, public read

### 2. Hook `useCheckoutConfig`

Nouveau hook dans `src/hooks/useCheckoutConfig.ts` :
- `useCheckoutConfig()` — query pour lire la config
- `useSaveCheckoutConfig()` — mutation upsert

### 3. Nouvelle page admin `/admin/checkout`

Nouveau fichier `src/pages/admin/AdminCheckout.tsx` avec 4 onglets :

**Onglet Livraison** :
- Prix Colissimo domicile (input numérique)
- Prix Colissimo point relais (input numérique)
- Seuil de livraison gratuite (input numérique)
- Toggle activer/désactiver chaque mode

**Onglet Paiement** :
- Liste des moyens de paiement avec toggle on/off (virement bancaire, etc.)
- Note : l'intégration bancaire réelle (SogeCommerce, Stripe) nécessite des clés API tierces — cette section prépare l'infrastructure

**Onglet Points Relais** :
- Toggle activation des points relais
- Lien vers la configuration Colissimo existante (`/admin/colissimo`)

**Onglet Apparence** :
- Message de confirmation personnalisable
- Aperçu du tunnel de commande

### 4. Intégration dans le checkout

Modifier `Checkout.tsx` pour lire les tarifs depuis `useCheckoutConfig()` au lieu des constantes codées en dur `COLISSIMO_RATES`.

### 5. Route et navigation

- Ajouter la route `/admin/checkout/*` dans `Admin.tsx`
- Ajouter l'entrée dans `SIDEBAR_ITEMS` avec icône `ShoppingCart` (ou `CreditCard`)

### Fichiers modifiés/créés

| Fichier | Action |
|---|---|
| Migration SQL | Créer table `checkout_config` |
| `src/hooks/useCheckoutConfig.ts` | Nouveau — hook CRUD |
| `src/pages/admin/AdminCheckout.tsx` | Nouveau — page admin 4 onglets |
| `src/pages/admin/Admin.tsx` | Ajouter route + sidebar |
| `src/pages/Checkout.tsx` | Lire tarifs depuis la config DB |

