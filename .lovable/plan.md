
## Plan — Améliorations AdminOrders, Paramètres, Tri, Stock

### 7 fonctionnalités à implémenter

---

### 1. AdminOrders — "Renvoyer confirmation" + "Marquer comme payé"

**Renvoyer confirmation** : bouton dans le détail de commande qui appelle `send-order-confirmation` avec les données actuelles de la commande (même payload que le checkout). Utile si l'email initial n'est pas arrivé.

**Marquer comme payé** : bouton dans la liste ET dans le détail, visible quand `paymentStatus !== 'Paid'`. Il :
- Met `paymentStatus = 'Paid'` en base
- Envoie un email de confirmation de paiement via `send-order-confirmation` (nouveau type `"payment_confirmation"` avec template dédié dans la même edge function)

L'edge function `send-order-confirmation` est modifiée pour accepter un `emailType: "order_confirmation" | "payment_confirmation"` et renvoyer le bon template HTML.

**Fichiers** : `src/pages/admin/AdminOrders.tsx`, `supabase/functions/send-order-confirmation/index.ts`

---

### 2. AdminSettings Général — sauvegarder en base

Le tab Général utilise actuellement des `defaultValue` hardcodés ("LVTK6 Concept", "contact@lvtk6.com"). Ces champs sont connectés à `design_settings` mais ne lisent/écrivent pas les bonnes valeurs.

Correction : remplacer `defaultValue` par `value={designSettings.siteName}` et `onChange={e => updateDesignSettings({ siteName: e.target.value })}`, idem pour `contactEmail`, `contactPhone`, `siteTagline`. Tout est déjà en base dans `design_settings`, il faut juste connecter correctement les inputs.

**Fichiers** : `src/pages/admin/AdminSettings.tsx`

---

### 3. Tri (sort) dans Orders, Clients, Produits

Les pages Produits ont déjà un `sortBy` partiel. On unifie et complète :

- **Orders** : tri par date (récent/ancien), total (haut/bas), statut — avec un `<Select>` en haut
- **Customers** : tri par nom, dépenses totales (haut/bas), points fidélité, date d'inscription
- **Products** : le tri existe déjà (`sortBy` state), juste ajouter les options manquantes si nécessaire

**Fichiers** : `src/pages/admin/AdminOrders.tsx`, `src/pages/admin/AdminCustomers.tsx`

---

### 4. Modification du stock en cliquant sur le nombre dans AdminProducts

Dans la liste produits (`AdminProducts.tsx`), la colonne stock affiche un nombre. En cliquant dessus, un petit input inline apparaît pour modifier la valeur directement, avec confirmation par `Enter` ou bouton ✓. La sauvegarde passe par `useUpdateProduct`.

**Fichiers** : `src/pages/admin/AdminProducts.tsx`

---

### 5. Auto-synchronisation produits → stock central

Quand un produit est créé via `AdminProducts` (et pas via `AdminStock`), il n'est pas automatiquement ajouté à l'inventaire central ni au stock Web.

Solution : après `createProduct.mutateAsync(...)`, si un produit est créé avec succès, créer automatiquement l'entrée `inventory` correspondante et une entrée `stock_levels` sur la location `web` avec la quantité initiale du produit.

Cette logique est déjà présente dans `AdminStock` lors de l'import — on l'applique aussi à la création via ProductForm.

**Fichiers** : `src/pages/admin/AdminProducts.tsx`

---

### 6. Bouton Transfert dans l'inventaire global (AdminStock)

Dans l'`InventoryView` (vue Inventaire Global), ajouter un bouton "Transférer" sur chaque ligne de produit. Il ouvre un dialog permettant de choisir :
- La quantité à transférer
- La source (Web) → destination (liste des boutiques)

Réutilise la logique existante de `BoutiquesView.handleAddProduct` mais exposée depuis l'inventaire global sans avoir à naviguer vers Boutiques.

**Fichiers** : `src/pages/admin/AdminStock.tsx`

---

### 7. Édition complète des produits depuis AdminStock

Dans la vue `InventoryView`, le bouton crayon ouvre déjà `InventoryProductDialog` (qui permet d'éditer stock, tailles, couleurs, etc.). Il manque l'édition de : nom, prix, catégorie, description, image, SKU.

`InventoryProductDialog` charge déjà toutes ces données lors de l'édition (`editData` prop). L'ajout de champs prix et image dans le dialog complètera l'édition complète.

**Fichiers** : `src/components/admin/InventoryProductDialog.tsx`

---

### Fichiers modifiés

| Fichier | Changements |
|---|---|
| `supabase/functions/send-order-confirmation/index.ts` | Ajouter type `payment_confirmation` + template |
| `src/pages/admin/AdminOrders.tsx` | Boutons "Renvoyer" + "Marquer payé" + tri |
| `src/pages/admin/AdminSettings.tsx` | Connecter inputs Général à `designSettings` |
| `src/pages/admin/AdminCustomers.tsx` | Ajouter tri |
| `src/pages/admin/AdminProducts.tsx` | Stock inline-edit + auto-sync vers inventaire |
| `src/pages/admin/AdminStock.tsx` | Bouton transfert dans InventoryView |
| `src/components/admin/InventoryProductDialog.tsx` | Champs prix + image en édition |

