

## Plan : Bouton "Synchronisation WordPress" dans Admin Produits

### Contexte
L'infrastructure WooCommerce existe deja (edge function `woocommerce-import`, page `/admin/woocommerce`). Le but est d'ajouter un accès rapide directement depuis la page Produits, avec gestion intelligente des doublons.

### 1. Nouveau mode dans l'edge function `woocommerce-import`

Ajouter un paramètre `mode` à l'edge function :
- `mode: "preview"` — retourne les produits WooCommerce mappés **sans les insérer**, avec un flag `isDuplicate` pour chaque produit dont le SKU existe deja en base
- `mode: "import"` (défaut, comportement actuel) — insère/upsert comme avant
- Enrichir le mapping pour récupérer **toutes les images** (pas seulement la première), le poids, les dimensions, et les attributs complets

### 2. Dialog "Synchronisation WordPress" dans AdminProducts

Nouveau composant `WordPressSyncDialog` affiché depuis un bouton dans la toolbar produits :

**Étape 1 — Connexion** : champs URL boutique, clé API, secret API (pré-remplis depuis localStorage si déjà utilisés)

**Étape 2 — Aperçu** : tableau des produits trouvés sur WordPress avec :
- Nom, image, prix, SKU, stock
- Badge "Nouveau" ou "Doublon (SKU existant)"
- Checkbox pour sélectionner lesquels importer
- Pour les doublons : bouton "Comparer" montrant côte-à-côte le produit local vs WordPress, avec choix "Garder local" / "Remplacer par WordPress"

**Étape 3 — Import** : import des produits sélectionnés via l'edge function en mode `import`, avec barre de progression

### 3. Enrichissement des données importées

L'edge function importera désormais :
- Toutes les images du produit (galerie complète, pas juste la première)
- Description courte + description longue
- Poids et dimensions
- Tous les attributs (pas uniquement taille/couleur)
- Tags et catégories multiples
- Prix promo avec dates

### Fichiers modifiés/créés

| Fichier | Action |
|---|---|
| `supabase/functions/woocommerce-import/index.ts` | Ajouter mode preview + enrichir mapping |
| `src/components/admin/WordPressSyncDialog.tsx` | Nouveau — dialog de synchronisation |
| `src/pages/admin/AdminProducts.tsx` | Ajouter bouton "Sync WordPress" dans la toolbar |

