## Diagnostic

Après audit du fichier `src/pages/admin/AdminProductBadges.tsx`, du résolveur `src/lib/productTrustBadges.ts` et du rendu `src/components/product/ProductInfo.tsx` :

- Les modifications SONT bien propagées au contexte (`updateDesignSettings` met à jour l'état optimiste immédiatement) et sauvegardées via l'autosave. Les pages produit lisent bien `designSettings.productTrustBadges`.
- **Ce qui manque et provoque l'impression que "rien ne change"** :
  1. Aucun **aperçu en direct** dans la page admin — impossible de voir l'effet sans quitter l'écran, ouvrir une page produit et rafraîchir.
  2. L'ajout d'une catégorie repose sur une saisie libre (`homme`, `femme`…) alors que les produits utilisent `Homme`, `Femme`, `Enfant`. Le matching flou fonctionne mais rien ne guide l'utilisateur ni ne confirme quel produit reçoit quels badges.
  3. Aucun indicateur qui montre, pour chaque onglet catégorie, si la surcharge est réellement utilisée par des produits existants.
  4. Le résolveur `getProductTrustBadges` retombe sur `DEFAULT_TRUST_BADGES` (constante en dur) quand `cfg.default` est vide, au lieu d'utiliser la valeur enregistrée — source de confusion si l'utilisateur vide sa liste par défaut.

## Ce que je vais faire

### 1. Aperçu en direct (colonne latérale sticky)
Dans `AdminProductBadges.tsx` : ajouter une colonne à droite (empilée sous mobile) qui rend **exactement** la barre de badges telle qu'affichée dans `ProductInfo.tsx` (mêmes classes Tailwind, icônes, grid dynamique). Elle réagit :
- au brouillon local (avant même l'autosave),
- à la catégorie de l'onglet actif (Défaut / Homme / Femme / Enfant / Sportwear / custom),
- au switch "Global activé/désactivé",
- au switch `enabled` de chaque badge.

Un menu déroulant "Prévisualiser comme…" permet de simuler n'importe quelle catégorie existante en base.

### 2. Sélecteur de catégories réel
- Remplacer la saisie libre par un `Select` alimenté par les catégories réellement présentes dans les produits (via `products` du contexte) + les 4 catégories suggérées.
- Afficher à côté de chaque onglet le **nombre de produits** concernés (compte via `products.filter(p => normalizeKey(p.category) === key)`), pour que l'utilisateur voie l'impact.
- Badge visuel "Utilise Défaut" / "Personnalisé" par catégorie.

### 3. Fiabilisation du résolveur
Dans `src/lib/productTrustBadges.ts` :
- Respecter `cfg.default` même vide (n'écraser par `DEFAULT_TRUST_BADGES` que si `cfg.default` est `undefined`, jamais si l'utilisateur l'a vidé volontairement).
- Ajouter un match exact prioritaire avant le match "includes" pour éviter qu'une catégorie courte n'attrape une catégorie longue par erreur.

### 4. UX de la page admin
- Bouton "Voir un produit de cette catégorie" (ouvre le premier produit correspondant dans un nouvel onglet) pour vérifier immédiatement.
- Message inline "✓ Appliqué en direct sur les pages produit" à chaque commit.
- Conserver l'autosave + `AdminSaveBar` déjà en place.

### Fichiers touchés
- `src/pages/admin/AdminProductBadges.tsx` — refonte complète (aperçu, sélecteur, compteurs).
- `src/lib/productTrustBadges.ts` — correction résolveur + export d'un helper de rendu partagé avec l'aperçu.
- (aucun changement de schéma DB, aucun changement de types)

### Détails techniques
- L'aperçu importe `TRUST_BADGE_ICONS` et reproduit la grille `grid-cols` dynamique de `ProductInfo`.
- Le comptage produit utilise la même `normalizeKey` que le résolveur pour garantir la cohérence.
- Aucun impact sur le rendu réel des pages produit hormis la petite correction du fallback `default` vide.