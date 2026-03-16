
## Thinking

The user wants to:
1. Upload a product mockup image (like the Marco jacket shown)
2. AI analyzes the image's "DNA" (colors, sizes, product name, composition, etc.)
3. Automatically generates a fully interactive, dynamic product page from it

The existing `parse-products-pdf` edge function already handles image analysis with Gemini. I need to:

1. **Extend the existing edge function** OR create a new `parse-product-image` edge function that:
   - Accepts an image (jpg/png/webp)
   - Uses Gemini vision to extract: product name, subtitle, price, colors (with hex codes!), sizes, composition/material, description, category, SKU
   - Also extracts the **color variants** as `colorOptions` with proper hex values
   - Returns a structured product object ready to pre-fill the ProductForm

2. **Add "Importer Maquette IA" button** in AdminProducts that:
   - Opens a dialog with a dropzone accepting images
   - Sends image to the edge function
   - Shows a preview of what was extracted (product name, colors swatches, sizes, material, etc.)
   - Lets admin review/edit before confirming creation
   - On confirm: creates the product in the DB with all extracted data

3. **Enrich color extraction**: The AI should extract the actual hex colors visible in the mockup image's color swatches, so the product page shows real color swatches matching the mockup.

Looking at the Marco image:
- Product name: MARCO
- Brand: Helvetica Mountain Pioneers x PEGASWOES  
- Season: HIVER 2026
- Colors: Noir (#1a1a1a), Bordeaux (#6B2235), Marine (#1a2744), Beige/Taupe (#A08B6E), Kaki (#5C6648), Gris (#6B7280)
- Sizes: XS, S, M, L, XL, XXL
- Composition: 100% POLYESTER
- Tags: limited edition

## Plan

### 1. New edge function `analyze-product-image`
New file: `supabase/functions/analyze-product-image/index.ts`

Uses Gemini 2.5 Pro (best vision model) to analyze the image and extract:
- name, subtitle, price (ask to estimate if not found), category
- sizes (exact text from image)
- colors with **hex values** from the color swatches visible in image
- colorOptions: [{color: "#hex", label: "nom"}]
- material/composition
- description (generated from visual)
- sku (auto-generated)
- tags (e.g., "limited edition" if spotted)
- Any brand/collection info → subtitle

### 2. New UI component `ImportMockupDialog.tsx`
In `src/components/admin/ImportMockupDialog.tsx`:
- Image dropzone (jpg/png/webp/gif up to 10MB)
- Preview of uploaded image
- "Analyser avec l'IA" button
- Loading state with animated scan effect
- Results preview:
  - Product name, subtitle
  - Price field (editable, since AI may not find it)
  - Color swatches preview
  - Size badges preview
  - Material info
  - Generated description
- "Créer ce produit" confirm button
- On confirm: calls `useCreateProduct` + uploads image to storage + opens `ProductForm` pre-filled for final review

### 3. AdminProducts integration
- Add "Importer Maquette IA" button next to existing "Importer PDF" button
- Opens the new ImportMockupDialog
- After product created, show toast + option to go to product detail

### Files to create/modify
- `supabase/functions/analyze-product-image/index.ts` — new edge function
- `src/components/admin/ImportMockupDialog.tsx` — new UI dialog
- `src/pages/admin/AdminProducts.tsx` — add button + import dialog

## Implementation Steps

### Step 1: Edge function `analyze-product-image`
Input: `{ imageBase64: string, mimeType: string }`
Prompt to Gemini Pro Vision:
- Extract all visible product info
- Extract hex colors from color swatches
- Generate description if not present
- Output strict JSON matching `ExtractedProductData` schema

### Step 2: `ImportMockupDialog` component
States:
- `file`, `preview` (image URL)
- `analyzing` (loading state)
- `extracted` (ExtractedProductData | null)
- `editableData` (form state to review/edit before import)

UX Flow:
1. Drag & drop or click to upload image
2. Preview appears
3. Click "Analyser avec IA" → loading scan animation
4. Results appear: color swatches, size badges, all info
5. User can edit price/name if needed
6. Click "Créer le produit" → uploads image to storage, creates product, success

### Step 3: AdminProducts button
Add "Importer Maquette" button with `Wand2` icon (magic wand for AI)
