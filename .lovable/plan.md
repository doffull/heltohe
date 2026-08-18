# Brouillons produits + Corbeille

## Objectif
Deux nouveautés dans la gestion du catalogue :
1. **Brouillon** : créer/enregistrer un produit sans le publier (invisible côté client, modifiable à volonté).
2. **Corbeille** : les suppressions deviennent réversibles — le produit part dans une corbeille, avec restauration ou suppression définitive.

## Ce que ça change pour vous

### Statuts produit
Chaque produit a un statut visible dans la liste admin :
- **Brouillon** — jamais affiché sur le site (ni boutique, ni accueil, ni recherche, ni page produit).
- **Publié** — visible normalement (l'interrupteur Actif/Inactif existant reste utilisable pour masquer temporairement un produit publié).

Dans le formulaire produit, deux boutons d'enregistrement : « Enregistrer le brouillon » et « Publier ». Depuis la liste, on peut publier ou repasser en brouillon en un clic, y compris en sélection multiple.

### Corbeille
- Le bouton Supprimer envoie désormais le produit à la corbeille (avec message « Annuler » immédiat).
- Nouvel onglet **Corbeille** dans /admin/products : date de suppression, restauration individuelle ou multiple, et **Supprimer définitivement** (avec confirmation explicite).
- Un bouton « Vider la corbeille » supprime définitivement tout d'un coup.
- Les produits en corbeille sont exclus partout : site public, admin (autres onglets), stock, pages, recherche, exports.

### Filtres de la liste admin
Onglets : Tous · Publiés · Brouillons · Corbeille, avec compteurs.

## Détails techniques

### Base de données (migration)
Sur `public.products` :
- `status text not null default 'published'` (valeurs `draft` | `published`), index sur `status`.
- `deleted_at timestamptz null`, `deleted_by uuid null`, index partiel sur `deleted_at is null`.
- Les lignes existantes restent `published`, `deleted_at = null` : aucun impact sur le catalogue actuel.
- Politiques RLS : la lecture publique (`anon`/`authenticated`) est restreinte à `deleted_at is null and status = 'published'`; les rôles admin/stock voient tout. Les GRANT actuels sont conservés.

### Code
- `src/hooks/useProducts.ts` : mapper `status` / `deletedAt` dans `dbToAppProduct`, ajouter au `FIELD_MAP`; `useProducts()` filtre `deleted_at is null` et accepte des options (`includeDrafts`, `onlyTrashed`) pour l'admin; nouveaux hooks `useSoftDeleteProduct`, `useRestoreProducts`, `useHardDeleteProducts`, `useBulkSetProductStatus`, et `useTrashedProducts`.
- `src/types/index.ts` : ajout de `status` et `deletedAt` au type `Product`.
- `src/lib/shopVisibility.ts` : exclure les brouillons et les produits en corbeille de toute liste client (boutique, accueil, nouveautés, top ventes, collab, pages).
- `src/pages/admin/AdminProducts.tsx` : onglets de statut + compteurs, badge Brouillon/Publié, actions groupées (publier / brouillon / corbeille / restaurer / supprimer définitivement), vue Corbeille (desktop + carte mobile).
- `src/components/admin/ProductForm.tsx` : double bouton d'enregistrement (brouillon / publier).
- `src/pages/ProductDetail.tsx` et `BoutiqueRouter` : un produit brouillon ou en corbeille renvoie vers la page 404 pour les visiteurs (les admins voient un bandeau « Brouillon — non visible publiquement »).

### Hors périmètre
Pas de purge automatique après X jours (suppression définitive manuelle uniquement), sauf demande contraire.
