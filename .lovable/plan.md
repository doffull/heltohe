## Objectif

Transformer "Rejoindre le programme" en un vrai parcours fidélité : page publique attractive, espace client fonctionnel (points, historique, récompenses échangeables), et logique serveur (gain de points sur commande, échange de récompenses, mise à jour automatique du palier).

L'infrastructure DB existe déjà (`customers.loyalty_points/tier`, `loyalty_rewards`, `loyalty_transactions`) mais n'est pas exploitée.

---

## 1. Nouvelle page publique `/fidelite`

Fichier : `src/pages/Fidelite.tsx` + route ajoutée dans `src/App.tsx`.

Contenu :
- Hero "Programme Fidélité Helvetica" (style Industrial Luxury)
- Section "Comment ça marche" (3 étapes : commander → cumuler → échanger)
- Grille des 4 paliers (Bronze/Silver/Gold/Platinum) avec avantages détaillés
- Catalogue public des récompenses disponibles (depuis `loyalty_rewards` actives)
- FAQ simple
- CTA dynamique :
  - Visiteur anonyme → bouton **"Créer mon compte"** vers `/auth`
  - Utilisateur connecté → bouton **"Voir mes points"** vers `/compte/fidelite`

Le bouton "Rejoindre le programme" du `LoyaltyBanner` redirige désormais vers `/fidelite` (au lieu de `/auth`) pour tous, ce qui permet de présenter le programme avant l'inscription.

## 2. Espace client `/compte/fidelite` refondu

Réécriture de `src/pages/AccountLoyalty.tsx` pour utiliser les vraies données :

- **Carte statut** : palier actuel (icône + couleur), points actuels, progression vers le palier suivant (barre %), points restants.
- **Récompenses échangeables** : grille des `loyalty_rewards` actives, avec bouton "Échanger pour X pts" :
  - Désactivé si points insuffisants
  - Au clic → appel RPC `redeem_loyalty_reward(reward_id)` → toast succès avec code promo généré
- **Historique** : table des `loyalty_transactions` du client (date, type earn/redeem/adjust, points ±, description, lien commande si présent).
- **Comment gagner plus** : encart explicatif avec multiplicateurs par palier.

Nouveau hook `src/hooks/useLoyalty.ts` :
- `useLoyaltyData()` → renvoie `{ customer, transactions, rewards, currentTier, nextTier, progress }`
- `useRedeemReward()` → mutation appelant la RPC

## 3. Logique serveur (migration Supabase)

### Constantes paliers (côté code)
```
bronze   : 0 pts     × 1.0
silver   : 500 pts   × 1.5
gold     : 1500 pts  × 2.0
platinum : 5000 pts  × 3.0
```

### RPC `award_loyalty_points(p_order_id uuid)` (SECURITY DEFINER)
- Vérifie que la commande a `payment_status='paid'` ou `status='shipped'` et que `loyalty_awarded_at` est NULL
- Calcule points = `floor(subtotal * multiplicateur du palier actuel)`
- Met à jour `customers.loyalty_points`, `customers.total_spent`, `customers.loyalty_tier` (recalcul auto selon nouveau total)
- Insère ligne `loyalty_transactions` (type='earn', order_id, description)
- Marque `orders.loyalty_awarded_at = now()`
- Retourne `jsonb` avec points gagnés et nouveau palier
- Appelée automatiquement via trigger `AFTER UPDATE ON orders` quand le statut passe à `paid`/`shipped`

### Colonne `orders.loyalty_awarded_at timestamptz` (nullable)
Ajoutée via migration pour idempotence.

### RPC `redeem_loyalty_reward(p_reward_id uuid)` (SECURITY DEFINER)
- Récupère le customer auth.uid()
- Vérifie reward active et `customer.loyalty_points >= reward.points_required`
- Génère un code promo unique dans `promo_codes` (type/value selon `reward_type`/`value`, `usage_limit=1`, `expires_at = now() + 90 days`)
- Décrémente `customer.loyalty_points`
- Insère `loyalty_transactions` (type='redeem', points négatifs, description, lien promo)
- Retourne `{ success, code, expiresAt }`

### RLS additionnelle
- `loyalty_transactions` : `Users can view their own loyalty transactions` existe déjà ✓
- Aucune nouvelle policy nécessaire (les RPC sont SECURITY DEFINER).

### Seed récompenses par défaut (si table vide)
Insertion via migration de 4 récompenses :
- "5€ de réduction" — 200 pts — fixed_amount 5
- "10€ de réduction" — 400 pts — fixed_amount 10
- "Livraison offerte" — 300 pts — free_shipping
- "-15% sur une commande" — 800 pts — percentage 15

## 4. Petit bouton dans le compte

Ajouter dans `AccountDashboard` (déjà présent : "Programme Fidélité" → `/compte/fidelite`) un affichage rapide des points et palier (utilise le nouveau hook).

## 5. Vérification

- Visiteur anonyme : `/` → clic "Rejoindre le programme" → `/fidelite` (page publique). Clic CTA → `/auth`.
- Utilisateur connecté : `/fidelite` → CTA "Voir mes points" → `/compte/fidelite` qui affiche vrais points/historique/récompenses.
- Échange d'une récompense : décrémente points, génère code promo, ajoute ligne historique.
- (Côté admin) une commande passée à payé déclenche le trigger qui octroie les points.

## Fichiers créés / modifiés

**Créés :**
- `src/pages/Fidelite.tsx` — page publique
- `src/hooks/useLoyalty.ts` — données + mutations

**Modifiés :**
- `src/App.tsx` — route `/fidelite`
- `src/components/home/LoyaltyBanner.tsx` — CTA pointe vers `/fidelite`
- `src/pages/AccountLoyalty.tsx` — refonte fonctionnelle
- `src/pages/AccountDashboard.tsx` — affichage points réels

**Migrations Supabase :**
- Ajouter `orders.loyalty_awarded_at`
- Créer fonctions `award_loyalty_points` + `redeem_loyalty_reward`
- Trigger `AFTER UPDATE ON orders` → `award_loyalty_points`
- Seed `loyalty_rewards` si vide
