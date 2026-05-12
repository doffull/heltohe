## Objectif

Renforcer l'import CSV avec une **validation pré-import**, ajouter un **import de stock depuis PDF** (type rapport ATUM), et permettre l'**édition rapide du stock en cliquant sur un nombre** dans `/admin/stock`.

---

## 1. Validation pré-import CSV (produits)

Modifier `src/components/admin/CsvImportDialog.tsx` + `src/lib/csvProductMapper.ts`.

**Nouvelle étape "Validation"** entre le parsing et la prévisualisation :

- Détection **colonnes manquantes** : vérifier la présence des colonnes critiques (`Nom`/`name`, `UGS`/`sku` ou `ID`, `Tarif régulier`/`price`). Affiche un bandeau rouge bloquant si une colonne essentielle manque.
- Détection **SKU dupliqués dans le CSV** (même SKU sur plusieurs lignes).
- Détection **SKU déjà existants en base** (déjà fait, mais marqué comme warning explicite par ligne).
- **Prix incohérents** :
  - `price <= 0`
  - `sale_price >= price` (promo invalide)
  - `sale_price < 0`
- **Stock incohérent** : `stock < 0` ou non-numérique.
- **Image manquante** ou URL invalide (warning, non bloquant).

**Rapport d'erreurs par ligne** :
- Nouvelle colonne "Validation" dans le tableau de prévisualisation avec icône statut (`✓ OK`, `⚠ warning`, `✗ erreur`).
- Tooltip/popover par ligne listant les problèmes détectés.
- Compteur en haut : `X OK • Y warnings • Z erreurs`.
- Bouton "Exporter le rapport" → CSV des erreurs.
- Toggle "Ignorer les lignes en erreur" (par défaut activé) : seules les lignes valides + warnings sont importées.
- Bouton "Importer" désactivé si 0 ligne valide.

**Fichier nouveau** : `src/lib/csvProductValidator.ts` exposant :
```ts
validateMappedRows(rows: MappedCsvProduct[], existingSkus: Set<string>) 
  => { row: MappedCsvProduct; errors: string[]; warnings: string[] }[]
validateHeaders(headers: string[]) => { missing: string[] }
```

---

## 2. Import de stock par PDF (rapport ATUM)

Format détecté dans le fichier uploadé : tableau ATUM avec colonnes SKU, Nom, Stock actuel, etc.

**Nouvelle Edge Function** `supabase/functions/parse-stock-pdf/index.ts` :
- Accepte un PDF en base64.
- Appelle Lovable AI (`google/gemini-2.5-pro`) avec vision pour extraire un tableau JSON `[{ sku, name, stock, location? }]`.
- Retourne le JSON normalisé.

**Nouveau composant** `src/components/admin/StockPdfImportDialog.tsx` :
- Drop zone PDF (ou Excel `.xlsx`/`.csv` en bonus).
- Appel de l'edge function → prévisualisation tableau.
- Pour chaque ligne extraite :
  - Match SKU avec `inventory.sku` existant.
  - Affiche : SKU, nom détecté, stock actuel BDD, **nouveau stock**, delta (+/-).
  - Statut : `✓ Match`, `⚠ SKU inconnu`, `✗ Format invalide`.
- Sélecteur de **location cible** (web / boutique / B2B).
- Mode : `Remplacer` (set quantity) ou `Ajouter` (delta).
- Bouton "Appliquer" → upsert dans `stock_levels` pour chaque SKU matché.

**Bouton d'entrée** : ajouté dans `AdminStock.tsx` vue `inventory` à côté de "Sync WordPress" → "Importer stock (PDF)".

---

## 3. Édition rapide du stock par clic

Dans `AdminStock.tsx`, sur les vues `inventory` et `boutiques`, le **nombre de stock** affiché dans chaque colonne (Web / Boutiques / B2B / par variante) devient un bouton inline éditable.

Comportement :
- Hover : surlignage léger + curseur pointer + petite icône crayon.
- Clic : transforme la cellule en `<Input type="number">` focus auto.
- Validation par `Enter` ou blur → `supabase.from('stock_levels').upsert(...)`.
- `Escape` annule.
- Toast de confirmation, refresh realtime.
- Permission : réservé aux admins (déjà géré par RLS).

**Composant nouveau** : `src/components/admin/InlineStockEditor.tsx`
```tsx
<InlineStockEditor 
  inventoryId={...} 
  locationId={...} 
  size={...} 
  color={...} 
  currentValue={qty}
  onSaved={refresh}
/>
```

Remplace les `<span>{qty}</span>` actuels dans le tableau inventaire global et dans les popovers couleurs/tailles.

---

## Hors scope

- Pas de modification du schéma BDD (les tables `stock_levels`, `inventory`, `products` couvrent déjà tout).
- Pas de gestion multi-fichiers PDF en batch.
- Pas d'OCR custom : on s'appuie sur Gemini Vision via Lovable AI Gateway (pas de clé API requise).
- Pas de modification du flux WooCommerce existant.

---

## Fichiers impactés

**Créés**
- `src/lib/csvProductValidator.ts`
- `src/components/admin/StockPdfImportDialog.tsx`
- `src/components/admin/InlineStockEditor.tsx`
- `supabase/functions/parse-stock-pdf/index.ts`

**Modifiés**
- `src/components/admin/CsvImportDialog.tsx` (étape validation + rapport)
- `src/pages/admin/AdminStock.tsx` (bouton import PDF + remplacement des spans stock par `InlineStockEditor`)
- `supabase/config.toml` (déclaration de la nouvelle edge function avec `verify_jwt = false` si nécessaire)
