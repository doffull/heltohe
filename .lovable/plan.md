
## Plan : Sécurité HIBP + Nettoyage images + Gestion homepage admin complète

### 1. Protection mots de passe compromis (HIBP)

**Action manuelle requise** : Cette fonctionnalité ne peut pas être activée par code. Vous devez l'activer vous-même :
- Allez dans **Lovable Cloud > Users > Auth Settings** (icone engrenage) > **Email settings** > activez **Password HIBP Check**.

### 2. Nettoyage des images inutilisées

Les 12 fichiers dans `src/assets/products/` ne sont importés nulle part dans le code. Le dossier entier sera supprimé. Les images hero et catégories restent (utilisées comme fallbacks dans `Home.tsx`).

### 3. Colonne `promo_ends_at` sur la table `products`

Migration SQL ajoutant `promo_ends_at TIMESTAMP WITH TIME ZONE` pour permettre les promos avec countdown. Mise à jour du type `Product` et du hook `useProducts` pour mapper ce champ.

### 4. Section "Offres Flash" avec Countdown sur la Homepage

Nouveau composant `PromoCountdown.tsx` dans `src/components/home/` :
- Filtre les produits ayant `salePrice` + `promoEndsAt` dans le futur
- Affiche un décompte dynamique (J, H, M, S) sur chaque carte produit
- Carrousel horizontal avec badge countdown animé
- Intégré dans `Home.tsx` entre les catégories et les produits en vedette

### 5. Bandeau Fidélité sur la Homepage

Nouveau composant `LoyaltyBanner.tsx` dans `src/components/home/` :
- Présente les 4 paliers (Bronze, Silver, Gold, Platinum) avec avantages
- Si connecté : affiche les points de l'utilisateur et son tier actuel
- CTA vers `/compte/fidelite`
- Intégré dans `Home.tsx` après les produits

### 6. Refonte HomepageManagement dans le Dashboard Admin

Remplacement du composant existant par un centre de contrôle complet :
- **Onglet Sections** : réordonner/activer les sections de la homepage (Hero, Catégories, Promos Flash, Vedettes, Nouveautés, Fidélité, Newsletter)
- **Onglet Produits** : assigner des produits à chaque section via recherche + toggle (existant, conservé et étendu avec tags `promo`, `trending`, `style`)
- **Onglet Promos Flash** : liste des produits avec `salePrice`, possibilité de définir `promo_ends_at` (date picker) pour chaque produit promo
- **Onglet Fidélité** : toggle on/off de la section fidélité sur la homepage

### Fichiers modifiés/créés

| Fichier | Action |
|---|---|
| `src/assets/products/*` (12 fichiers) | Suppression |
| Migration SQL | Ajout `promo_ends_at` sur `products` |
| `src/types/index.ts` | Ajout `promoEndsAt?: string` au type Product |
| `src/hooks/useProducts.ts` | Mapper `promo_ends_at` |
| `src/components/home/PromoCountdown.tsx` | Nouveau — section promos flash countdown |
| `src/components/home/LoyaltyBanner.tsx` | Nouveau — bandeau fidélité |
| `src/pages/Home.tsx` | Intégration PromoCountdown + LoyaltyBanner |
| `src/pages/admin/AdminDashboard.tsx` | Refonte HomepageManagement avec 4 onglets |
