
## Plan : Sécurité HIBP + Nettoyage images + Gestion homepage admin complète

### 1. Protection mots de passe compromis (HIBP)

**Action manuelle requise** : Cette fonctionnalité ne peut pas être activée par code. Vous devez l'activer vous-même :
- Allez dans **Lovable Cloud > Users > Auth Settings** (icône engrenage) > **Email settings** > activez **Password HIBP Check**.
- Une fois fait, le warning de sécurité disparaîtra automatiquement au prochain scan.

### 2. Nettoyage des images inutilisées

Les fichiers suivants dans `src/assets/products/` ne sont importés nulle part dans le code et seront supprimés :
- `marco-mockup.jpg`, `accessoire-montre.jpg`, `accessoire-sac.jpg`, `enfant-doudoune.jpg`, `enfant-impermeable.jpg`, `enfant-sneakers.jpg`, `femme-bomber.jpg`, `femme-legging.jpg`, `femme-manteau-blanc.jpg`, `homme-cargo-pants.jpg`, `homme-hoodie.jpg`, `homme-veste-tech.jpg`

Le dossier `src/assets/products/` entier sera supprimé. Les images hero et catégories restent car elles sont utilisées comme fallbacks dans `Home.tsx`.

### 3. Gestion des Promos avec Chronomètre (Admin Dashboard)

**Nouveau composant dans `AdminDashboard.tsx`** : `PromoManagement`
- Section dédiée pour gérer les produits en promotion et en vedette
- Onglets : **Promos** | **En vedette** | **Nouveautés** | **Tendances**
- Pour les promos : possibilité de définir un **prix promo + date de fin** → le chronomètre countdown apparaîtra sur la homepage
- Toggle rapide pour ajouter/retirer un produit d'une section

**Modification de la table `products`** (migration) :
- Ajout colonne `promo_ends_at TIMESTAMP WITH TIME ZONE` — date de fin de la promo pour le countdown

### 4. Countdown Promo sur la Homepage

**Nouveau composant `PromoCountdown.tsx`** dans `src/components/home/` :
- Affiche un décompte (jours, heures, minutes, secondes) pour les produits ayant un `promo_ends_at` dans le futur
- S'affiche dans une section dédiée "OFFRES FLASH" sur la homepage, avec les produits en promo et leur timer
- Carrousel horizontal de cartes produits avec badge countdown

### 5. Programme de Fidélité visible sur la Homepage

**Nouveau composant `LoyaltyBanner.tsx`** dans `src/components/home/` :
- Bandeau/section sur la homepage présentant le programme de fidélité
- Affiche les paliers (Bronze, Silver, Gold, Platinum) avec les avantages
- Si l'utilisateur est connecté : affiche ses points actuels et son tier
- CTA "Rejoindre le programme" → redirige vers `/compte/fidelite`

### 6. Gestion complète de la Homepage (Admin Dashboard)

**Refonte du composant `HomepageManagement` dans `AdminDashboard.tsx`** pour être un centre de contrôle complet, style Shopify :

- **Sections de la homepage** : réordonner, activer/désactiver les sections (Hero, Catégories, Produits en vedette, Promos Flash, Fidélité, Newsletter, Nouveautés)
- **Produits par section** : assigner des produits à chaque section via recherche + toggle (existant, étendu)
- **Promos Flash** : créer/gérer les promos avec countdown (nouveau)
- **Programme Fidélité** : activer/désactiver la section fidélité sur la homepage

Interface en onglets dans un panel élargi.

### Fichiers modifiés/créés

| Fichier | Action |
|---|---|
| `src/assets/products/*` | Suppression (12 fichiers) |
| `src/pages/admin/AdminDashboard.tsx` | Refonte HomepageManagement → ajout onglets Promos, Sections, Fidélité |
| `src/components/home/PromoCountdown.tsx` | Création — section promos flash avec countdown |
| `src/components/home/LoyaltyBanner.tsx` | Création — bandeau fidélité homepage |
| `src/pages/Home.tsx` | Ajout sections PromoCountdown + LoyaltyBanner |
| `src/types/index.ts` | Ajout `promoEndsAt` au type Product |
| `src/hooks/useProducts.ts` | Mapper `promo_ends_at` |
| Migration SQL | Ajout `promo_ends_at` à la table `products` |

### Sécurité

Le warning `has_role_definer` est déjà documenté comme intentionnel avec audit log. Le warning `SUPA_auth_leaked_password_protection` nécessite une action manuelle (voir point 1).
