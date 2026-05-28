## Diagnostic

Le problème vient d’une différence entre le preview Lovable et le site publié :

- En preview, tu es souvent connecté comme admin, donc les données passent.
- Sur le domaine publié, le visiteur est anonyme.
- Plusieurs requêtes publiques échouent en `401` avec : `permission denied for function has_role`.
- Résultat : les produits, bannières, chat, boutons flottants, segments du jeu et certaines images ne chargent pas, donc le site paraît vide ou rempli de placeholders.

Les requêtes cassées observées sur le domaine publié :

- `products`
- `banners`
- `newsletter_popups`
- `home_fab_buttons`
- `roulette_segments_public`
- `bot_config_public`

Le backend est bien en ligne. Le souci est dans les règles d’accès aux données publiques après les durcissements sécurité précédents.

## Plan de correction

### 1. Réparer les règles publiques sans exposer les données sensibles

Créer une migration qui corrige les règles d’accès :

- Les politiques admin qui appellent `has_role(...)` ne doivent plus s’appliquer au rôle public/anonyme.
- Les tables publiques du site doivent garder une lecture anonyme propre :
  - produits actifs
  - catégories
  - bannières actives
  - popups actives
  - boutons flottants actifs
  - configuration publique du jeu
  - configuration publique du chatbot sans `system_prompt`
- Les champs sensibles restent bloqués :
  - `bot_config.system_prompt`
  - probabilités et valeurs internes de `roulette_segments`
  - email admin dans `roulette_config`
  - configuration privée admin

### 2. Corriger les vues publiques cassées

Revoir les vues :

- `bot_config_public`
- `roulette_segments_public`
- `roulette_config_public`
- `design_settings_public`

Objectif : elles doivent fonctionner pour les visiteurs anonymes, mais ne jamais exposer les champs privés.

### 3. Marquer/fixer les vrais résultats du scan sécurité

Traiter les findings actuels :

- Fixer `bot_config_no_public_select_restriction` sans casser le widget chatbot public.
- Fixer `roulette_segments_no_public_read_policy` sans exposer les probabilités ni les codes internes.
- Fixer définitivement `roulette_config_notify_admin_email` en gardant la vue publique nettoyée.
- Ignorer uniquement les warnings explicitement faux ou déjà sécurisés, avec mémoire sécurité mise à jour si nécessaire.

### 4. Rendre le frontend plus tolérant aux erreurs backend temporaires

Mettre à jour les hooks publics pour éviter qu’une erreur réseau fasse disparaître toute la page :

- `useProducts`
- `useCategories`
- `useBanners` / hooks de bannières publiques
- `useHomeFabButtons`
- `useRoulette`
- `useDesignSettings`

Chaque hook public doit :

- garder le dernier cache connu quand la requête échoue ;
- retourner un tableau vide proprement seulement si aucune donnée n’a jamais existé ;
- ne pas faire planter le rendu ;
- éviter les refetchs agressifs inutiles.

### 5. Stabiliser les médias visibles

Appliquer les composants médias robustes là où les placeholders apparaissent encore :

- hero
- catégories
- cartes produits
- bannières
- galerie produit
- sections homepage

But : une image cassée ne doit jamais casser le layout, et les dimensions doivent rester stables.

### 6. Vérifier sur le vrai domaine publié

Après migration et code :

- ouvrir `https://lvtk2026.helvetica-mp.net` en session anonyme ;
- vérifier les erreurs console ;
- vérifier les requêtes réseau ;
- confirmer que logo, hero, catégories, produits, chat et jeu chargent ;
- vérifier mobile 390px/414px et desktop.

## Résultat attendu

Le site publié doit afficher les mêmes données que le preview : logo, hero, images, catégories, produits, chat, jeu et design, même après update/publish, sans écran vide ni disparition massive de contenu.