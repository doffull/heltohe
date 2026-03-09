
## Summary of all requests

1. **Hero/Header mobile responsive** — HeroSlider uses fixed `h-[70vh] lg:h-[80vh]`, text sizing is OK but the content padding `px-6` is fine. The main issue on mobile is that the hero text overlaps with no consideration for the sidebar panel button at bottom. The header is `h-14 lg:h-20` and already responsive. Need to make the hero better on mobile: smaller title, tighter CTA.

2. **Logo cassé** — In `MainLayout.tsx` line 459, the sidebar background falls back to `'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800...'` when no `sidebarImage` is set. The splash screen at `App.tsx` line 90 falls back to `HMP` text. The logo in sidebar `Sidebar.tsx` line 42 shows a `<Layers>` icon when no `hudLogo`. Logo in header line 198-208 renders if `designSettings.hudLogo` exists. So if `hudLogo` is empty/null, all these fallbacks trigger. The issue is likely `hudLogo` is set but broken URL, OR the initial data still references an Unsplash URL that doesn't match the user's actual logo.

3. **Image parasite** — The `ProductImageGallery.tsx` lines 229-238 render **3 fake grayscale placeholder thumbnails** (copies of the main product image with overlay). These appear as ghost images the user didn't add. Also `src/data/initialData.ts` has Unsplash images in `INITIAL_PRODUCTS`, `heroSlides`, `categories`, `backgroundMedia` — these are fallbacks only used if DB is empty. The real problem: the 3 placeholder thumbnails in ProductImageGallery must be removed.

4. **Catégorie Homme → arrive sur Boutique** — In `MainLayout.tsx` line 75, category nav items are built as `href: /boutique/${cat.slug}` — this goes to `/boutique/homme` which is handled by `BoutiqueRouter`, not `CategoryPageRouter`. The correct clean URL is `/${slug}` (e.g. `/homme`). Fix: change line 75 to use `/${c.slug}` instead of `/boutique/${c.slug}`.

5. **Scroll vers image au clic couleur** — When user clicks a color variant in `ProductOptions.tsx`, `onColorChange` is called. Need to scroll to `ProductImageGallery` (the image at the top of the page) with smooth behavior. Add a `ref` on the gallery container and call `scrollIntoView` when color changes.

6. **Mini-menu popup variations couleur** — Add a floating sticky panel on mobile (and optionally desktop) showing color swatches. When user clicks a color, it triggers the existing `onColorChange` + scroll to image. This is a small floating pill/sheet at the left side of the product page.

7. **Features bar — une seule ligne sur mobile** — In `ProductInfo.tsx` lines 79-98, the grid is `grid-cols-1 sm:grid-cols-3`. On mobile (`<sm`) it stacks. Change to `grid-cols-3` always (no stacking), with smaller text/icons on mobile.

8. **Livraison gratuite → 200€ en point relais** — Change from "Livraison gratuite dès 100€" to "Livraison gratuite dès 200€ en point relais" in `ProductInfo.tsx` line 84.

9. **Garantie → 1 an (pas 2 ans)** — Change "Garantie 2 ans" to "Garantie 1 an" in `ProductInfo.tsx` line 85.

---

## Files to modify

| File | Changes |
|---|---|
| `src/components/home/HeroSlider.tsx` | Better mobile sizing: `h-[55vh] sm:h-[70vh] lg:h-[80vh]`, smaller title on mobile `text-3xl sm:text-4xl lg:text-6xl xl:text-7xl`, tighter padding |
| `src/components/product/ProductImageGallery.tsx` | Remove the 3 fake placeholder thumbnails (lines 229-238); add `ref` forwarding for scroll |
| `src/components/product/ProductInfo.tsx` | Fix features bar to `grid-cols-3` always; update copy: "200€ en point relais", "1 an" |
| `src/components/product/ProductOptions.tsx` | Add `onColorChange` scroll-to-image callback via a ref passed from parent; add floating color variant quick-picker |
| `src/pages/ProductDetail.tsx` | Add `imageRef` ref; pass `scrollToImage` callback to `ProductOptions`; wire `onColorChange` to scroll |
| `src/components/layout/MainLayout.tsx` | Fix category nav href: line 75 change `/boutique/${c.slug}` → `/${c.slug}` |

---

## Detailed logic

### Category nav fix (1 line)
```typescript
// Line 75 in MainLayout.tsx — change:
href: `/boutique/${c.slug || encodeURIComponent(c.title.toLowerCase())}`,
// to:
href: `/${c.slug || encodeURIComponent(c.title.toLowerCase())}`,
```

### Remove phantom thumbnails
In `ProductImageGallery.tsx`, delete the `{/* Placeholder thumbnails */}` block (3 grayscale copies shown when no colorOptions and no video).

### Features bar — always 3 columns
```tsx
// Change: className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 border-y border-border"
// To:    className="grid grid-cols-3 gap-2 sm:gap-4 py-4 sm:py-6 border-y border-border"
// And icons: h-5 w-5 sm:h-7 sm:w-7, text-[10px] sm:text-xs
```

### Scroll to image on color change
In `ProductDetail.tsx`, add a `imageRef = useRef<HTMLDivElement>(null)` and pass a `scrollToImage` fn:
```typescript
const scrollToImage = useCallback(() => {
  imageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}, []);
```
Wrap `ProductImageGallery` in a `div ref={imageRef}`.
Pass `onColorChange` in `ProductOptions` to call both `setSelectedColor` AND `scrollToImage`.

### Floating color variant popup
Add a small `<ColorVariantPopup>` component — a fixed pill/button on the left side of screen on product pages that expands to show color swatches. Only visible when product has colors. It triggers `onColorChange` + scroll.

```text
Mobile layout — product page:
┌────────────────────────────┐
│         [Image]            │
│                            │
│  ◉ [COLOR POPUP]           │  ← floating left, toggles open
└────────────────────────────┘
│    Product Info             │
│    Size selector            │
│    [Add to Cart]            │
└────────────────────────────┘

When popup expanded:
┌──────────────────┐
│ 🎨 COULEURS      │
│ ● ● ●           │  (swatches)
└──────────────────┘
```
