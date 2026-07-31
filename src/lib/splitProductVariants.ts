import { Product, ColorOption } from '@/types';

export interface SplitRow {
  /** Raw color value (hex or name) used as the variant key. */
  colorKey: string;
  label: string;
  name: string;
  sku: string;
  image: string;
  galleryImages: string[];
  selected: boolean;
  option: ColorOption;
}

export function slugifyForSku(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

/** Color options of a product, falling back to plain `colors` when needed. */
export function getVariantOptions(product: Product): ColorOption[] {
  if (product.colorOptions && product.colorOptions.length > 0) return product.colorOptions;
  return (product.colors || []).map((c) => ({ color: c, label: c }));
}

/**
 * Build the editable preview rows for splitting a product into one product per color.
 * `existingSkus` is used to de-duplicate generated SKUs (-2, -3, …).
 */
export function buildSplitRows(product: Product, existingSkus: Iterable<string> = []): SplitRow[] {
  const taken = new Set(Array.from(existingSkus).map((s) => s.trim().toUpperCase()));
  const options = getVariantOptions(product);

  return options.map((option) => {
    const label = (option.label || option.color || '').trim() || 'Variante';
    const variantImages = (option.images && option.images.length > 0
      ? option.images
      : option.image
        ? [option.image]
        : []
    ).filter(Boolean);

    const base = `${slugifyForSku(product.sku)}-${slugifyForSku(label)}`.replace(/^-+/, '') || slugifyForSku(label);
    let sku = base;
    let n = 2;
    while (taken.has(sku.toUpperCase())) {
      sku = `${base}-${n}`;
      n += 1;
    }
    taken.add(sku.toUpperCase());

    const gallery = Array.from(new Set([...variantImages, ...(product.galleryImages || [])])).filter(Boolean);

    return {
      colorKey: option.color,
      label,
      name: `${product.name} - ${label}`,
      sku,
      image: variantImages[0] || product.image,
      galleryImages: gallery,
      selected: true,
      option,
    };
  });
}

export interface BuildPayloadOptions {
  /** Include the source product gallery images in each child product. */
  includeSourceGallery?: boolean;
  /** Stock to assign to the child product. */
  stock?: number;
  /** Copy price / sale price from the source product (default true). */
  inheritPrice?: boolean;
  /** Copy the source images (main image + gallery). When false only the variant images are kept. */
  inheritImages?: boolean;
  /** Copy the published/draft status of the source product (default true). */
  inheritStatus?: boolean;
  /** Published status of the source product, used when `inheritStatus` is true. */
  sourceIsActive?: boolean;
}

/** Build the create payload for one child product. */
export function buildChildProduct(
  product: Product,
  row: SplitRow,
  opts: BuildPayloadOptions = {},
): Omit<Product, 'id'> {
  const {
    includeSourceGallery = true,
    stock,
    inheritPrice = true,
    inheritImages = true,
    inheritStatus = true,
    sourceIsActive,
  } = opts;
  const variantImages = (row.option.images && row.option.images.length > 0
    ? row.option.images
    : row.option.image
      ? [row.option.image]
      : []
  ).filter(Boolean);

  const gallery = inheritImages && includeSourceGallery
    ? row.galleryImages
    : Array.from(new Set(variantImages));

  const singleOption: ColorOption = {
    ...row.option,
    label: row.label,
    image: variantImages[0] || row.option.image,
    images: variantImages.length > 0 ? variantImages : row.option.images,
  };

  return {
    name: row.name.trim() || `${product.name} - ${row.label}`,
    subtitle: product.subtitle,
    price: inheritPrice ? product.price : 0,
    salePrice: inheritPrice ? product.salePrice : undefined,
    image: inheritImages ? (row.image || product.image) : (variantImages[0] || ''),
    category: product.category,
    stock: typeof stock === 'number' ? stock : product.stock,
    sku: row.sku.trim(),
    description: product.description,
    material: product.material,
    careInstructions: product.careInstructions,
    sizes: product.sizes || [],
    colors: [row.label],
    colorOptions: [singleOption],
    attributes: product.attributes || {},
    videoUrl: product.videoUrl,
    tags: product.tags || [],
    promoEndsAt: product.promoEndsAt,
    modelHeight: product.modelHeight,
    modelSizeWorn: product.modelSizeWorn,
    modelName: product.modelName,
    galleryImages: gallery,
    templateId: product.templateId ?? null,
    isActive: inheritStatus ? (sourceIsActive ?? product.isActive ?? true) : false,
  };
}
