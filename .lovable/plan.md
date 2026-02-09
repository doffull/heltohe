

# Plan complet : Import PDF, Espace Media, Bannieres, Categories, Donnees fictives, Commandes avancees

Ce plan est divise en 6 blocs fonctionnels. Chaque bloc est independant mais ils seront tous implementes ensemble.

---

## Bloc 1 : Import en masse de produits via PDF

### Principe
Une edge function recoit le fichier PDF, l'envoie a un modele AI (Lovable AI / Gemini) pour extraire les produits (nom, description, prix, tailles, couleurs, categorie, SKU, stock), puis renvoie un JSON structure. L'interface admin permet de previsualiser les produits extraits avant de les inserer en base.

### Fichiers concernes
- **`supabase/functions/parse-products-pdf/index.ts`** (nouveau) : Edge function qui recoit le PDF en base64, appelle Gemini pour extraire les donnees structurees, retourne un tableau de produits
- **`src/pages/admin/AdminProducts.tsx`** : Ajout d'un bouton "Importer via PDF", zone de drop pour le fichier, dialog de previsualisation des produits extraits avec possibilite de valider/supprimer chaque produit avant insertion en masse

### Logique
1. L'admin drop un PDF dans la zone
2. Le fichier est envoye a l'edge function
3. L'AI extrait les produits et renvoie un JSON
4. L'admin voit une liste previsualisation et peut editer chaque produit
5. Clic sur "Importer tout" insere les produits en base via `useCreateProduct`

---

## Bloc 2 : Espace Media centralise

### Principe
Un nouvel onglet "Media" dans l'admin qui liste tous les fichiers du bucket `media` de Lovable Cloud Storage. L'admin peut uploader, supprimer, copier l'URL et previsualiser les fichiers.

### Fichiers concernes
- **`src/pages/admin/AdminMedia.tsx`** (nouveau) : Page listant les fichiers du bucket `media` (images + videos), avec upload drag-and-drop, suppression, copie d'URL, filtres par type
- **`src/hooks/useMediaLibrary.ts`** (nouveau) : Hook qui liste les fichiers du bucket storage via `supabase.storage.from('media').list()`
- **`src/pages/admin/Admin.tsx`** : Ajout de la route `/admin/media` et du lien dans le sidebar admin

---

## Bloc 3 : Bannieres visibles sur le site

### Principe
Les bannieres creees dans Marketing doivent s'afficher sur le site. Il y a 3 types : `hero` (en haut de la page d'accueil sous le slider), `promo` (bandeau horizontal), `popup` (popup modal au premier chargement).

### Fichiers concernes
- **`src/components/home/PromoBanner.tsx`** (nouveau) : Composant qui affiche les bannieres de type `promo` en bandeau horizontal anime
- **`src/components/home/PopupBanner.tsx`** (nouveau) : Composant modal popup pour les bannieres de type `popup`, avec fermeture et "ne plus afficher" (sessionStorage)
- **`src/pages/Home.tsx`** : Integration des composants PromoBanner (entre les sections) et PopupBanner (au chargement)
- **`src/hooks/useBanners.ts`** : Ajout d'un hook `useActiveBanners` cote public (les politiques RLS existent deja pour la lecture publique des bannieres actives)

---

## Bloc 4 : Categories - Taille, disposition, couverture

### Principe
Dans les parametres admin, on peut deja creer des categories. On ajoute la possibilite de choisir la taille d'affichage (petit/moyen/grand), le mode de couverture de l'image (cover/contain), et la disposition de la grille (2/3/4 colonnes).

### Fichiers concernes
- **`src/hooks/useCategories.ts`** : Ajout de champs `displaySize` et `coverMode` dans le type `CategoryRecord`
- **`src/pages/admin/AdminSettings.tsx`** : Ajout de selecteurs de taille (S/M/L) et de mode d'affichage (cover/contain) dans le formulaire de categorie. Ajout d'un selecteur de disposition de grille (2, 3 ou 4 colonnes)
- **`src/pages/Home.tsx`** : Application dynamique du nombre de colonnes et de la taille des vignettes de categories

### Migration SQL
Ajout des colonnes `display_size` (text, defaut 'medium') et `cover_mode` (text, defaut 'cover') sur la table `categories`.

---

## Bloc 5 : Donnees fictives (clients + commandes)

### Principe
Insertion de donnees de demonstration dans les tables `customers` et `orders` via des requetes SQL. Ces donnees permettent de tester le dashboard, les commandes et les clients.

### Donnees inserees
- **10 clients fictifs** avec differents niveaux de fidelite (bronze, silver, gold, platinum), des noms francais, emails, points et totaux depenses
- **15 commandes fictives** reparties sur les 3 derniers mois avec differents statuts (Pending, Processing, Shipped, Delivered, Cancelled), methodes de paiement et articles

Les clients fictifs utiliseront l'user_id de l'admin existant (956f6ec9-44ce-42fd-afbc-0127a5c2a462) car la table `customers` a une contrainte `user_id NOT NULL` et des RLS qui exigent un user_id. Alternativement, les commandes seront inserees sans `user_id` (nullable) pour eviter les conflits.

---

## Bloc 6 : Commandes avancees (details, factures, livraison, paiement)

### Principe
Enrichir la page AdminOrders avec un panneau de detail complet pour chaque commande, incluant la gestion du paiement, la generation de factures PDF, et le suivi d'expedition.

### Fichiers concernes
- **`src/pages/admin/AdminOrders.tsx`** : Refonte avec :
  - Dialog de detail complet (infos client, liste des articles, adresse de livraison)
  - Selection du mode de paiement (CB, virement, PayPal) et du statut de paiement
  - Selection du transporteur (Colissimo, Chronopost, Mondial Relay) avec champ numero de suivi
  - Bouton "Generer la facture" qui cree un PDF telechargeable (via generation HTML/CSS en blob)
  - Bouton "Modifier la commande" pour editer les notes et les statuts
- **`src/hooks/useOrders.ts`** : Ajout de `useUpdateOrder` pour mettre a jour tous les champs (notes, payment_method, payment_status, status)

### Colonnes supplementaires necessaires
Ajout des colonnes `tracking_number` (text) et `shipping_carrier` (text) sur la table `orders`.

---

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| `supabase/functions/parse-products-pdf/index.ts` | Nouveau - Edge function parsing PDF via AI |
| `src/pages/admin/AdminMedia.tsx` | Nouveau - Espace media centralise |
| `src/hooks/useMediaLibrary.ts` | Nouveau - Hook listing fichiers storage |
| `src/components/home/PromoBanner.tsx` | Nouveau - Bandeau promo sur le site |
| `src/components/home/PopupBanner.tsx` | Nouveau - Popup banniere |
| `src/pages/admin/AdminProducts.tsx` | Modifie - Ajout import PDF |
| `src/pages/admin/AdminOrders.tsx` | Modifie - Refonte detail commande + facture |
| `src/pages/admin/AdminSettings.tsx` | Modifie - Taille/disposition categories |
| `src/pages/admin/Admin.tsx` | Modifie - Route media |
| `src/pages/Home.tsx` | Modifie - Bannieres + categories dynamiques |
| `src/hooks/useOrders.ts` | Modifie - useUpdateOrder |
| `src/hooks/useBanners.ts` | Modifie - useActiveBanners |
| `src/hooks/useCategories.ts` | Modifie - Nouveaux champs |
| Migration SQL | Colonnes categories + orders + donnees fictives |

## Details techniques - Migration SQL

```sql
-- Colonnes categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_size text DEFAULT 'medium';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS cover_mode text DEFAULT 'cover';

-- Colonnes orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier text;
```

## Details techniques - Edge Function (parse-products-pdf)

L'edge function utilisera l'API Lovable AI (Gemini 2.5 Flash) pour analyser le contenu du PDF et extraire les produits. Le prompt demandera un JSON structure avec les champs : name, subtitle, price, salePrice, category, sizes, colors, description, material, sku, stock.

## Details techniques - Generation de facture

La facture sera generee cote client en construisant un document HTML formate, puis converti en blob PDF via `window.print()` ou une iframe cachee. Pas de dependance externe necessaire.

