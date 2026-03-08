
## Plan : 4 features on the product detail page + admin

### Scope
1. **Size guide modal** — "Guide des tailles" link near the size selector → responsive table XS→XXL + body diagram
2. **Editable color swatch picker in ImportMockupDialog** — after AI analysis, each extracted swatch is clickable and opens a native color picker to adjust the hex
3. **Related products section** — bottom of ProductDetail, horizontal scroll, same category, hover zoom
4. **Per-color image swap** — clicking a color swatch in the gallery changes the main image; admin ProductForm gets an image upload per color option

---

### 1. Size Guide Modal — new component

**New file**: `src/components/product/SizeGuideModal.tsx`

Static size table (XS→XXL) with measurements in cm (chest, waist, hips, length). Add an ASCII/SVG body silhouette illustration using inline SVG (a simple outline with measurement arrows — no external assets needed).

In `ProductOptions.tsx`, add a small "Guide des tailles →" link (text button) next to the `Taille` label. Clicking it opens `SizeGuideModal` as a `Dialog`.

---

### 2. Color swatch editor in ImportMockupDialog

In `ImportMockupDialog.tsx`, replace the read-only swatch display in the extracted results panel with an editable list:

- Each row: color preview circle (clickable `<input type="color">` hidden behind it) + editable label input + remove button
- Clicking the circle opens the native browser color picker
- Adds "+ Ajouter couleur" button to push a new blank entry
- State: `editableColors` (array of `{color, label}`) initialized from `extracted.colorOptions` on analysis complete; passed to `handleCreate` instead of `extracted.colorOptions`

State changes:
```
const [editableColors, setEditableColors] = useState<ColorOption[]>([]);
// set on analysis success: setEditableColors(p.colorOptions)
```

---

### 3. Related products section

In `ProductDetail.tsx`, after the two-column grid, add a `RelatedProducts` section:

**New file**: `src/components/product/RelatedProducts.tsx`
- Queries `useProducts()`, filters to `same category` + `id !== current`, max 8
- Horizontal scroll container with `overflow-x-auto` + `flex gap-4`
- Each card: fixed `w-52 shrink-0`, image with `hover:scale-105 transition-transform duration-500`, name, price
- Click navigates to `/boutique/:id`
- Loading skeleton (3 shimmer cards)

---

### 4. Per-color image in admin ProductForm + gallery swap

**ProductForm.tsx** — in the color options section (around line 96–114), update `addColorOption` and the render of each existing `colorOption` to include an optional image URL field:
- Each color row already shows color + label. Add a small `FileDropZone` (compact) or URL input for `image` per swatch
- `addColorOption` already includes `{ color, label }` → add `image?: string`

**ProductImageGallery.tsx** — already handles `activeColorOption?.image` correctly (line `const displayImage = (activeColorOption?.image) || image`). No change needed here — this is already done.

**ProductDetail.tsx** — `selectedColor` state drives `onColorChange` callback in `ProductImageGallery` already. This is already wired. The main image swap already works via `displayImage` in the gallery.

So the only real change for feature 4 is: **admin ProductForm** color row → add image upload per color option. When saved, `colorOptions[i].image` gets stored and the gallery auto-uses it.

---

### Files to modify/create

| File | Change |
|---|---|
| `src/components/product/SizeGuideModal.tsx` | **New** — dialog with table + SVG silhouette |
| `src/components/product/RelatedProducts.tsx` | **New** — horizontal scroll related products |
| `src/components/product/ProductOptions.tsx` | Add "Guide des tailles" link + import SizeGuideModal |
| `src/pages/ProductDetail.tsx` | Add `<RelatedProducts>` below the grid |
| `src/components/admin/ImportMockupDialog.tsx` | Replace static swatches with editable color picker rows |
| `src/components/admin/ProductForm.tsx` | Add image upload per color option row |

No DB changes needed — `colorOptions` JSONB column already stores `{ color, label, image }`.
