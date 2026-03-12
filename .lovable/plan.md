
## Analysis of the reference screenshot

The screenshot shows a WooCommerce-style Colissimo plugin interface with these key elements:

**Structure:**
- 3 top tabs: "Commandes", "Création de bordereau", "Historique des bordereaux"
- Header: "Commandes Colissimo" with 2 action buttons: "Mettre à jour les statuts Colissimo" + "Importer des numéros de suivi"
- Toolbar: "Actions groupées" dropdown + "Appliquer" button + "Afficher les filtres" link + search box + pagination count
- Table columns: Checkbox | ID ↕ | Numéro de commande ↕ | Date ↕ | Client ↕ | Adresse ↕ | Pays ↕ | Méthode de livraison ↕ | Statut de la commande ↕ | **Etiquettes (aller / retour / bordereau)**
- Each row shows: order ID (clickable), order number, date, client name, full address (multiline), country code (FR/CA/etc.), shipping method ("Colissimo relais" / "Colissimo avec signature"), order status ("En cours")
- Etiquettes column shows: "+ Générer l'étiquette aller" green link, and if already generated: tracking number (clickable green) + 4 action icons (info, print, download, delete) + "+ Générer l'étiquette retour"

**New tabs to add:**
1. "Création de bordereau" — generate a daily manifest (bordereau) listing all packages to drop at post office
2. "Historique des bordereaux" — history of past manifests

**Key UI changes vs current:**
- Replace current card-based KPI + filter buttons layout with a WooCommerce-style table approach
- Rename tabs: "Commandes" (was Expéditions), "Création de bordereau" (new), "Historique des bordereaux" (new), keep "Points Relais" and "Configuration"
- Add sortable columns with ↕ arrows
- "Méthode de livraison" column (from order data — `order.paymentMethod` or a new `shippingMethod` field)
- "Pays" column (from `order.customer.country`)
- Full address in Adresse column (street + city + zip multiline)
- Replace current "Actions" column with inline "Etiquettes" column showing:
  - If no tracking: green "+ Générer l'étiquette aller" link
  - If tracking exists: tracking number (clickable) + icon row (info/print/download/delete) + "+ Générer l'étiquette retour"
- "Actions groupées" dropdown with bulk actions: generate labels, update statuses, delete
- "Mettre à jour les statuts Colissimo" → calls La Poste tracking API to refresh status of in-transit orders
- "Importer des numéros de suivi" → CSV import modal
- Pagination at top right
- Keep KPI counters but move them to a compact inline header
- "Afficher les filtres" → expandable filter row (date range, status, country, shipping method)

**Bordereau tab:**
- Form to select date + list of packages to include
- Generate bordereau PDF (calls colissimo-proxy with new action `generateBordereau`)
- Download button

**Historique bordereaux tab:**
- Table of past bordereaux (date, number of packages, PDF link)
- Store in a local state or DB table

## Plan

### Files to modify

| File | Changes |
|---|---|
| `src/pages/admin/AdminColissimo.tsx` | Full redesign matching screenshot layout |

### No DB migration needed
The orders table already has all needed fields. Bordereau history can be stored in a new simple table or localStorage for now — we'll use a `bordereaux` table in the DB.

### DB migration needed
- New table `colissimo_bordereaux`: id, created_at, date, package_count, pdf_base64 (or storage URL), tracking_numbers (jsonb)

### Edge function update
- Add action `refreshTrackingStatuses` — calls La Poste tracking API for each in-transit order and updates status
- Add action `generateBordereau` — generates a bordereau SOAP call or PDF manifest
- Add action `importTrackingNumbers` — accepts array of {orderNumber, trackingNumber} to batch-save

### AdminColissimo.tsx redesign

**Tab 1: "Commandes"** — replaces ExpeditionsTab
- Header with "Commandes Colissimo" title + "Mettre à jour les statuts" + "Importer des numéros de suivi" buttons
- Actions groupées dropdown (Select → Generate labels, Update statuses, Delete)
- Afficher les filtres expandable (country, shipping method, date range, status)
- Search box top right + pagination
- Sortable table: Checkbox | ID | N° commande | Date | Client | Adresse | Pays | Méthode | Statut | Etiquettes
  - Etiquettes: "+ Générer étiquette aller" (green) / tracking_number (green clickable) + icons + "+ Générer étiquette retour"
- Remove old KPI cards (keep them as counters in the header subtitle)

**Tab 2: "Création de bordereau"** — new
- Date picker (default today)
- List of eligible packages (status Shipped, no bordereau yet)
- Checkboxes to select packages to include
- "Générer le bordereau" button → calls edge function → downloads PDF → saves to DB

**Tab 3: "Historique des bordereaux"** — new
- Table: Date | Nombre de colis | Actions (télécharger PDF, supprimer)
- Data from `colissimo_bordereaux` DB table

**Tab 4: "Points Relais"** — keep existing

**Tab 5: "Configuration"** — keep existing

### Implementation approach for "return label"
Add a second label action per row: when `trackingNumber` exists, show "+ Générer l'étiquette retour" which calls `generateLabel` with `isReturn: true` → edge function uses product code `REPA` instead of `DOM/A2P`.

### Icon actions on tracking number row (matching screenshot)
- ℹ️ Info → opens suivi page
- 🖨️ Print → print PDF 
- ⬇️ Download → download PDF
- 🗑️ Delete → remove tracking number from order

### Import numéros de suivi
Modal with textarea or CSV file input to paste/upload rows of `orderNumber,trackingNumber` → parse and batch-save to DB.

### Sort
Client-side sort with sortKey + sortDir state, applied to filtered orders array.

### Pagination  
Client-side pagination, 20 orders per page, "X éléments | ‹ ‹ page/total › ›" top right matching screenshot.

### Mettre à jour statuts
Calls La Poste suivi API for each in-transit order — this is a best-effort feature. We'll call `https://api.laposte.fr/suivi/v2/idships/{trackingNumber}` which requires an API key, OR we can just mark it as "checking" and note it requires setup. For now, implement as a button that calls the edge function `refreshTrackingStatuses` with a list of tracking numbers, the function returns updated statuses.

### DB migration
```sql
CREATE TABLE public.colissimo_bordereaux (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  bordereau_date date not null,
  package_count int not null default 0,
  tracking_numbers jsonb default '[]',
  pdf_base64 text
);
ALTER TABLE public.colissimo_bordereaux ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access bordereaux" ON public.colissimo_bordereaux FOR ALL USING (true);
```

### Summary of all changes

1. **SQL migration** — `colissimo_bordereaux` table
2. **Edge function** — add `generateBordereau`, `refreshTrackingStatuses`, `importTrackingNumbers`, return label support
3. **`src/pages/admin/AdminColissimo.tsx`** — full redesign: 5 tabs, new WooCommerce-style table, sortable columns, pagination, import modal, bordereau tabs, return label action
