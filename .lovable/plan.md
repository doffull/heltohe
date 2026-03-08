
## Analysis

### Current state — Category routing

Right now when you click "Homme" in the category grid:
1. `AppContext.navigateToCategory` calls `navigate('/boutique/homme')` 
2. `BoutiqueRouter` receives `slugOrId = 'homme'`
3. It checks for a custom page with that slug → if it has sections, renders `PageRenderer` + `<Shop categoryFromSlug>` below
4. If no page sections → falls back to `<Shop categoryFromSlug="Homme" />`

**Problem**: the Shop component always shows "Boutique" as H1, category tabs include everything, and the URL is `/boutique/homme` not `/homme`.

**What the user wants**:
- `/homme`, `/femme`, `/enfant` etc. — dedicated clean URLs **without** `/boutique` prefix
- Each category has its own page (managed from admin Pages, already built in DB)
- `/boutique` stays as the full catalogue with all categories + filters

### Current state — Category pages in admin

The `pages` table already has `type: 'category'` rows linked to categories via `category_id`. These are managed in `AdminPages`. The page builder lets admins add hero sections, text, product grids etc. This connection already exists in the DB — it just isn't exposed on clean URLs.

### Plan

---

### Feature 1 — Clean category URLs `/[slug]`

**`src/App.tsx`**: Add new route `/:categorySlug` that tries to resolve to a category page before falling through to 404.

```
Route: /:categorySlug  →  <CategoryPageRouter />
```

New component `src/pages/CategoryPageRouter.tsx`:
- Gets `categorySlug` from params
- Looks up `useCategories()` to find a category with that slug
- If found: queries `usePage(slug)` — renders `PageRenderer` (custom sections) + `<Shop categoryFromSlug>` products below
- If not found: renders `<NotFound />`

**`src/context/AppContext.tsx`**: Update `navigateToCategory`:
```typescript
navigate(`/${slug}`);  // instead of /boutique/${slug}
```

**`src/components/home/CategoryGrid.tsx`**: Link clicks already call `navigateToCategory` — no change needed.

**`BoutiqueRouter`**: Keep as-is for `/boutique/:slugOrId` (product UUIDs + product detail pages). Remove category slug handling from there since category pages now live at `/:slug`.

---

### Feature 2 — WooCommerce import connector

New admin page: `src/pages/admin/AdminWooCommerce.tsx`

A configuration form with:
- WooCommerce store URL (e.g. `https://monsite.com`)
- Consumer Key + Consumer Secret (from WooCommerce → Settings → Advanced → REST API)
- Test connection button
- Import sections: Products, Orders, Customers (with checkboxes)
- "Lancer l'import" button

Store the WooCommerce credentials securely in the database as a `settings` row (or use Supabase secrets via an Edge Function).

**Edge Function** `supabase/functions/woocommerce-import/index.ts`:
- Receives `{ url, key, secret, importProducts, importOrders, importCustomers }`
- Calls WooCommerce REST API v3 (`/wp-json/wc/v3/products`, `/orders`, `/customers`)
- Maps and upserts data into Supabase `products`, `orders`, `customers` tables
- Returns progress summary

Add "WooCommerce" entry to `Admin.tsx` sidebar.

Secrets needed: stored per-import via the edge function (user enters credentials in UI), not as global secrets.

---

### Files to modify/create

| File | Change |
|---|---|
| `src/pages/CategoryPageRouter.tsx` | **New** — resolves `/:categorySlug` to a category page + products |
| `src/App.tsx` | Add `/:categorySlug` route before `*` catch-all |
| `src/context/AppContext.tsx` | `navigateToCategory` → `navigate('/${slug}')` |
| `src/pages/admin/AdminWooCommerce.tsx` | **New** — WooCommerce config + import UI |
| `src/pages/admin/Admin.tsx` | Add WooCommerce route + sidebar link |
| `supabase/functions/woocommerce-import/index.ts` | **New** — Edge function that calls WC REST API + upserts data |
| `src/pages/BoutiqueRouter.tsx` | Remove category slug matching (clean separation) |

---

### Route priority in App.tsx

```text
/                    → Home
/boutique            → Shop (all products)
/boutique/:slugOrId  → BoutiqueRouter (product detail OR custom page)
/panier              → Cart
/a-propos            → About
/auth                → Auth
/compte/*            → Account
/admin/*             → Admin
/:categorySlug       → CategoryPageRouter  ← NEW (before catch-all)
*                    → NotFound
```

The `/:categorySlug` route goes BEFORE the `*` catch-all. It internally validates against known category slugs, so non-matching slugs fall through to NotFound behavior inside the component.

---

### WooCommerce import mapping

| WC field | Local table/field |
|---|---|
| `products[].name` | `products.name` |
| `products[].price` | `products.price` |
| `products[].images[0].src` | `products.image` |
| `products[].categories[0].name` | `products.category` |
| `products[].stock_quantity` | `products.stock` |
| `orders[].billing` | `orders.customer_*` |
| `orders[].total` | `orders.total` |
| `orders[].line_items` | `orders.items` |
| `customers[].email` | `customers.email` |
| `customers[].first_name/last_name` | `customers.first_name/last_name` |

No DB migrations needed — all target tables already exist with correct columns.
