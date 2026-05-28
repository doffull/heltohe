// Template presets for product/category pages
export type BlockType =
  | 'gallery' | 'breadcrumb' | 'category_tag' | 'sku' | 'title' | 'collab_subtitle'
  | 'price' | 'stock_status' | 'model_info' | 'find_size_btn' | 'trust_badges'
  | 'description' | 'material' | 'sizes_selector' | 'quantity_selector'
  | 'cta_add_to_cart' | 'btn_wishlist' | 'btn_share' | 'related_products' | 'custom_html'
  | 'divider' | 'spacer';

export interface TemplateBlock {
  id: string;
  type: BlockType;
  col?: number;       // 1-12 (grid-column-start)
  span?: number;      // 1-12 (grid-column-span)
  row?: number;
  rowSpan?: number;
  visible?: boolean;
  props?: Record<string, any>;
}

export interface TemplateTheme {
  colors: {
    bg: string;
    fg: string;
    primary: string;
    accent: string;
    muted: string;
    card: string;
    border: string;
  };
  font?: string;
  radius?: string;
  shadow?: string;
}

export interface TemplateLayout {
  grid: { cols: number; gap: number };
  blocks: TemplateBlock[];
}

export interface PageTemplate {
  id?: string;
  name: string;
  slug: string;
  type: 'product' | 'category';
  isDefault?: boolean;
  theme: TemplateTheme;
  layout: TemplateLayout;
  previewImage?: string;
}

const uid = () => Math.random().toString(36).slice(2, 9);

export const BUGGY_PRESET: PageTemplate = {
  name: 'Buggy',
  slug: 'buggy',
  type: 'product',
  theme: {
    colors: {
      bg: '#f8f8f8',
      fg: '#1a1a1a',
      primary: '#1a1a1a',
      accent: '#e63c2f',
      muted: '#888888',
      card: '#ffffff',
      border: '#e8e8e8',
    },
    font: "'Inter', 'Helvetica Neue', sans-serif",
    radius: '12px',
    shadow: '0 4px 40px rgba(0,0,0,0.08)',
  },
  layout: {
    grid: { cols: 12, gap: 0 },
    blocks: [
      { id: uid(), type: 'breadcrumb', col: 1, span: 12, visible: true },
      { id: uid(), type: 'gallery', col: 1, span: 6, visible: true, props: { sticky: true } },
      { id: uid(), type: 'category_tag', col: 7, span: 6, visible: true },
      { id: uid(), type: 'title', col: 7, span: 6, visible: true, props: { uppercase: true, size: 42 } },
      { id: uid(), type: 'collab_subtitle', col: 7, span: 6, visible: true },
      { id: uid(), type: 'price', col: 7, span: 6, visible: true, props: { size: 36 } },
      { id: uid(), type: 'stock_status', col: 7, span: 6, visible: true },
      { id: uid(), type: 'model_info', col: 7, span: 6, visible: true },
      { id: uid(), type: 'find_size_btn', col: 7, span: 6, visible: true },
      { id: uid(), type: 'trust_badges', col: 7, span: 6, visible: true },
      { id: uid(), type: 'description', col: 7, span: 6, visible: true },
      { id: uid(), type: 'material', col: 7, span: 6, visible: true },
      { id: uid(), type: 'sizes_selector', col: 7, span: 6, visible: true },
      { id: uid(), type: 'quantity_selector', col: 7, span: 6, visible: true },
      { id: uid(), type: 'cta_add_to_cart', col: 7, span: 6, visible: true },
      { id: uid(), type: 'related_products', col: 1, span: 12, visible: true },
    ],
  },
};

export const MINIMAL_PRESET: PageTemplate = {
  name: 'Minimal',
  slug: 'minimal',
  type: 'product',
  theme: {
    colors: { bg: '#ffffff', fg: '#0a0a0a', primary: '#0a0a0a', accent: '#0a0a0a', muted: '#737373', card: '#ffffff', border: '#e5e5e5' },
    radius: '4px', shadow: 'none',
  },
  layout: {
    grid: { cols: 12, gap: 32 },
    blocks: [
      { id: uid(), type: 'gallery', col: 1, span: 12 },
      { id: uid(), type: 'title', col: 4, span: 6 },
      { id: uid(), type: 'price', col: 4, span: 6 },
      { id: uid(), type: 'sizes_selector', col: 4, span: 6 },
      { id: uid(), type: 'cta_add_to_cart', col: 4, span: 6 },
      { id: uid(), type: 'description', col: 4, span: 6 },
    ],
  },
};

export const CLASSIC_PRESET: PageTemplate = {
  name: 'Boutique Classique',
  slug: 'classic',
  type: 'product',
  isDefault: true,
  theme: {
    colors: { bg: '#ffffff', fg: '#0a0a0a', primary: '#0a0a0a', accent: '#e63c2f', muted: '#737373', card: '#ffffff', border: '#e5e5e5' },
    radius: '8px', shadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  layout: {
    grid: { cols: 12, gap: 24 },
    blocks: [
      { id: uid(), type: 'gallery', col: 1, span: 6 },
      { id: uid(), type: 'title', col: 7, span: 6 },
      { id: uid(), type: 'price', col: 7, span: 6 },
      { id: uid(), type: 'description', col: 7, span: 6 },
      { id: uid(), type: 'sizes_selector', col: 7, span: 6 },
      { id: uid(), type: 'quantity_selector', col: 7, span: 6 },
      { id: uid(), type: 'cta_add_to_cart', col: 7, span: 6 },
      { id: uid(), type: 'trust_badges', col: 7, span: 6 },
      { id: uid(), type: 'related_products', col: 1, span: 12 },
    ],
  },
};

export const MAGAZINE_PRESET: PageTemplate = {
  name: 'Magazine',
  slug: 'magazine',
  type: 'product',
  theme: {
    colors: { bg: '#fafaf7', fg: '#1a1a1a', primary: '#1a1a1a', accent: '#c9a84c', muted: '#888888', card: '#ffffff', border: '#e8e8e8' },
    font: "'Cormorant Garamond', serif", radius: '0px', shadow: 'none',
  },
  layout: {
    grid: { cols: 12, gap: 48 },
    blocks: [
      { id: uid(), type: 'gallery', col: 1, span: 8 },
      { id: uid(), type: 'category_tag', col: 9, span: 4 },
      { id: uid(), type: 'title', col: 9, span: 4 },
      { id: uid(), type: 'price', col: 9, span: 4 },
      { id: uid(), type: 'description', col: 9, span: 4 },
      { id: uid(), type: 'sizes_selector', col: 9, span: 4 },
      { id: uid(), type: 'cta_add_to_cart', col: 9, span: 4 },
    ],
  },
};

export const TEMPLATE_PRESETS: PageTemplate[] = [
  BUGGY_PRESET,
  MINIMAL_PRESET,
  CLASSIC_PRESET,
  MAGAZINE_PRESET,
];

export const BLOCK_LABELS: Record<BlockType, string> = {
  gallery: 'Galerie images',
  breadcrumb: "Fil d'Ariane",
  category_tag: 'Catégorie',
  sku: 'SKU',
  title: 'Titre produit',
  collab_subtitle: 'Sous-titre / Collab',
  price: 'Prix',
  stock_status: 'Stock',
  model_info: 'Info mannequin',
  find_size_btn: 'Trouver ma taille',
  trust_badges: 'Badges (livraison, garantie…)',
  description: 'Description',
  material: 'Matière',
  sizes_selector: 'Sélecteur de tailles',
  quantity_selector: 'Sélecteur quantité',
  cta_add_to_cart: 'Bouton Ajouter au panier',
  btn_wishlist: 'Bouton Wishlist',
  btn_share: 'Bouton Partager',
  related_products: 'Produits similaires',
  custom_html: 'HTML libre',
  divider: 'Séparateur',
  spacer: 'Espace vertical',
};

export const newBlock = (type: BlockType): TemplateBlock => ({
  id: uid(), type, col: 1, span: 12, visible: true,
});
