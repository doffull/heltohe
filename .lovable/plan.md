

## What the user wants

Looking at the screenshot carefully: it shows a **WooCommerce-like expandable product list** in the stock/inventory section where:
- Each product row has a **parent row** (product header — teal/cyan background with checkbox, product image, name, icon, SKU, and total stock like "0 | 77")
- Below each parent row are **expandable child rows** — one per size variant (XS, S, L, M, XL, XXL) with individual quantities (8, 14, 18, 18, 12, 7)
- The child rows show the same product image, size label (↑ Xs, ↑ S, etc.), SKU, price €199.00, and stock quantity per size
- All rows have checkboxes on the left

The user also wants:
1. This WooCommerce-style expandable variant view **in Admin > Stock (Inventaire Global)** — not just a tooltip, but actual expandable rows showing stock per size/variant
2. Verify bulk deletion in Admin > Produits works (already implemented)
3. Verify "Gérer le stock" button works (already implemented)
4. Verify variant stock grid in product form works (already implemented)

For points 2-4: the code shows these ARE already implemented. The issue is the expandable WooCommerce-style variant rows in the inventory view.

## What needs to change

The `InventoryView` in `AdminStock.tsx` currently shows products with stock numbers in cells and a tooltip on hover to see variant breakdown. The user wants an **expandable row system** like WooCommerce where clicking a product row expands to show individual size rows below.

### Changes to `AdminStock.tsx` — `InventoryView` + `InventoryTable`

Transform the inventory table so:

1. **Parent row** (product level): checkbox, image, product name, SKU, channel, total stock per location. Has a **chevron expand button**.
2. **Child rows** (per variant): when expanded, show one row per size (and optionally per color) with individual stock quantities. Each child row has: image (smaller), size label with arrow icon like screenshot, SKU, price, stock per location.
3. The expand/collapse is toggled by clicking the chevron or the row.
4. The "Edit" cells remain clickable in child rows to edit individual variant stock.

### Implementation approach

**Minimal change**: Modify the `InventoryView`'s table rendering in `AdminStock.tsx` to:

1. Add `expandedRows` state (Set of inventory IDs).
2. For each `InventoryItem` row, render the parent row with a `ChevronRight`/`ChevronDown` toggle.
3. When expanded, inject child rows (`<tr>` elements with indentation/bg) for each size variant from `stockLevels` filtered by that inventory ID. Each child row shows: image (w-8 h-8), size with ↑ prefix, same SKU, price from matched product, stock quantity (editable inline).
4. The child rows match the teal/cyan aesthetic of the screenshot with a slightly different background (e.g., `bg-primary/5`).
5. The total cell in parent row shows format `reserved | quantity` like the screenshot's "0 | 77".

## Files to change

| File | Change |
|---|---|
| `src/pages/admin/AdminStock.tsx` | Modify `InventoryView` table to add expandable variant rows (WooCommerce style) |

## Technical detail

In the `InventoryView` function, the table rows are rendered in the `.map((item: InventoryItem) => {...})` block around line 655. I'll:

1. Add `expandedItems` state (`Set<string>`)
2. For the parent row: add a `ChevronDown/Right` button in first cell, style parent row distinctly
3. After the parent `<tr>`, conditionally render child `<tr>` rows for each variant (size or size+color combination) from `stockLevels` where `inventory_id === item.id` and `location_id === webLocation?.id`
4. Child rows: indented, lighter bg (`bg-primary/5`), show ↑ icon + size label, stock quantity editable inline
5. Parent row shows aggregated total in format `0 | total`

This gives an exact WooCommerce-like look matching the screenshot — expandable per-size rows under each product.

