

## Plan : Responsive Admin + Sync WordPress étendue + Validation rapide commandes + Couleurs sections admin

### 1. Responsive mobile — Toutes les pages admin

Audit et correction de toutes les pages admin pour garantir un rendu mobile parfait (360px) :

**Pages concernées** : AdminDashboard, AdminProducts, AdminOrders, AdminCustomers, AdminCheckout, AdminColissimo, AdminStock, AdminPages, AdminMedia, AdminMarketing, AdminDesign, AdminChatbot, AdminWooCommerce, AdminAudit, AdminSettings.

**Corrections systématiques** :
- Toolbars de filtres : passage en `flex-col` sur mobile avec `w-full` sur chaque élément
- Tables : conteneur `overflow-x-auto` + `min-w-[600px]` sur les `<table>` pour scroll horizontal propre
- Boutons d'action groupés : wrap sur 2 lignes ou empilés verticalement
- Titres de page : taille réduite (`text-xl` au lieu de `text-3xl` sur mobile)
- Dialogs : `max-h-[85vh] overflow-y-auto` pour ne pas dépasser l'écran

### 2. Synchronisation WordPress étendue — Clients, Commandes, Stocks

Réutiliser le pattern du `WordPressSyncDialog` (produits) pour 3 nouveaux flux :

**A. Sync Clients (`AdminCustomers.tsx`)** :
- Bouton "Sync WordPress" dans la toolbar
- Appel à l'edge function `woocommerce-import` avec `mode: "preview-customers"` et `mode: "import-customers"`
- L'edge function récupère `/wp-json/wc/v3/customers` et mappe vers la table `customers`
- Détection de doublons par email
- Dialog en 3 étapes (connexion → aperçu → import)

**B. Sync Commandes (`AdminOrders.tsx`)** :
- Même pattern, `mode: "preview-orders"` / `mode: "import-orders"`
- Récupère `/wp-json/wc/v3/orders` et mappe vers la table `orders`
- Détection de doublons par `order_number`

**C. Sync Stocks (`AdminStock.tsx`)** :
- Même pattern, `mode: "preview-stock"` / `mode: "import-stock"`
- Récupère les quantités depuis WooCommerce et met à jour `stock_levels`
- Comparaison locale vs WP pour chaque SKU

**D. Gestion des clés API** :
- Dans AdminWooCommerce ou AdminSettings, ajouter un toggle "Activer/Désactiver la connexion WordPress"
- Quand désactivé, les clés sont conservées dans localStorage mais les syncs sont bloqués avec message explicatif

### 3. Validation rapide des commandes — 3 boutons colorés

Dans la liste des commandes (`AdminOrders.tsx`), ajouter pour chaque commande 3 boutons de validation rapide inline (sans ouvrir de dialog) :

| Bouton | Couleur | Action |
|---|---|---|
| **✓ Identité** | Bleu (`bg-blue-500`) | Marque l'adresse/nom comme vérifiés (badge visuel) |
| **✓ Paiement** | Vert (`bg-green-500`) | Marque le paiement comme "Paid" + email de confirmation |
| **✓ Expédié** | Violet (`bg-purple-500`) | Ouvre un mini-input pour le n° de suivi, puis marque "Shipped" |

Quand les 3 sont validés → la commande passe automatiquement en statut "Delivered" ou "Processing" avec un badge "Complète".

Stockage des validations : champ `validation_flags` (JSONB) ajouté à la table `orders` via migration.

### 4. Couleurs par section admin — Sidebar + header de page

**Couleurs par défaut pour chaque section** :

| Section | Couleur |
|---|---|
| Dashboard | Gris neutre |
| Produits | Bleu (`#3B82F6`) |
| Commandes | Orange (`#F59E0B`) |
| Checkout | Vert (`#10B981`) |
| Clients | Violet (`#8B5CF6`) |
| Pages | Indigo (`#6366F1`) |
| Média | Rose (`#EC4899`) |
| Marketing | Rouge (`#EF4444`) |
| Design | Cyan (`#06B6D4`) |
| Stock | Amber (`#D97706`) |
| Colissimo | Jaune (`#EAB308`) |
| Chatbot | Teal (`#14B8A6`) |
| WooCommerce | Violet foncé (`#7C3AED`) |
| Audit | Gris foncé (`#6B7280`) |
| Paramètres | Slate (`#64748B`) |

**Implémentation** :
- Constante `SIDEBAR_COLORS` associant chaque `href` à une couleur
- Sidebar : pastille ou bande de couleur sur chaque item
- Header de chaque page admin : bordure supérieure colorée
- Persistance des couleurs personnalisées dans `design_settings` (champ `admin_section_colors` JSONB)

### 5. Onglet "Couleurs Admin" dans AdminDesign

Nouveau sous-onglet dans AdminDesign pour personnaliser les couleurs de chaque section du tableau de bord. Interface avec :
- Liste de chaque section avec un color picker
- Aperçu live de la sidebar avec les couleurs
- Bouton de reset aux couleurs par défaut

### Migration SQL

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS validation_flags jsonb NOT NULL DEFAULT '{"identity": false, "payment": false, "shipping": false}';
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS admin_section_colors jsonb NOT NULL DEFAULT '{}';
```

### Fichiers modifiés/créés

| Fichier | Action |
|---|---|
| Migration SQL | `validation_flags` sur orders + `admin_section_colors` sur design_settings |
| `supabase/functions/woocommerce-import/index.ts` | Ajouter modes customers/orders/stock |
| `src/components/admin/WordPressSyncDialog.tsx` | Rendre générique (prop `syncType`) pour clients/commandes/stocks |
| `src/pages/admin/AdminOrders.tsx` | Responsive + 3 boutons validation rapide |
| `src/pages/admin/AdminCustomers.tsx` | Responsive + bouton Sync WordPress |
| `src/pages/admin/AdminStock.tsx` | Responsive + bouton Sync WordPress |
| `src/pages/admin/Admin.tsx` | Couleurs sidebar + bordure header colorée |
| `src/pages/admin/AdminDesign.tsx` | Onglet couleurs admin |
| Toutes les pages admin | Corrections responsive systématiques |

