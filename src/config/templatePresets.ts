// Template presets for product/category pages
import buggyImg from '@/assets/template-presets/buggy.jpg';
import minimalImg from '@/assets/template-presets/minimal.jpg';
import classicImg from '@/assets/template-presets/classic.jpg';
import magazineImg from '@/assets/template-presets/magazine.jpg';
import editorialImg from '@/assets/template-presets/editorial.jpg';
import showroomImg from '@/assets/template-presets/showroom.jpg';

export type BlockType =
  | 'gallery' | 'breadcrumb' | 'category_tag' | 'sku' | 'title' | 'collab_subtitle'
  | 'price' | 'stock_status' | 'model_info' | 'find_size_btn' | 'trust_badges'
  | 'description' | 'material' | 'sizes_selector' | 'quantity_selector'
  | 'cta_add_to_cart' | 'btn_wishlist' | 'btn_share' | 'related_products' | 'custom_html'
  | 'divider' | 'spacer';

export interface TemplateBlock {
  id: string;
  type: BlockType;
  variant?: string;       // catalog variant (see blockVariants.ts)
  col?: number;
  span?: number;
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
  fontHeading?: string;   // Google Font name e.g. "Inter"
  fontBody?: string;
  radius?: string;
  shadow?: string;
  spacing?: number;       // base spacing scale in px
  containerWidth?: number;
  sectionPaddingY?: number;
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
  previewImage: buggyImg,
  theme: {
    colors: { bg: '#f8f8f8', fg: '#1a1a1a', primary: '#1a1a1a', accent: '#e63c2f', muted: '#888888', card: '#ffffff', border: '#e8e8e8' },
    fontHeading: 'Inter', fontBody: 'Inter',
    font: "'Inter', 'Helvetica Neue', sans-serif",
    radius: '12px', shadow: '0 4px 40px rgba(0,0,0,0.08)', spacing: 16,
  },
  layout: {
    grid: { cols: 12, gap: 0 },
    blocks: [
      { id: uid(), type: 'breadcrumb', col: 1, span: 12, visible: true },
      { id: uid(), type: 'gallery', variant: 'classic-thumbs-left', col: 1, span: 6, visible: true, props: { sticky: true } },
      { id: uid(), type: 'category_tag', col: 7, span: 6, visible: true },
      { id: uid(), type: 'title', col: 7, span: 6, visible: true, props: { uppercase: true, size: 42 } },
      { id: uid(), type: 'price', variant: 'large-bold', col: 7, span: 6, visible: true, props: { size: 36 } },
      { id: uid(), type: 'stock_status', col: 7, span: 6, visible: true },
      { id: uid(), type: 'find_size_btn', variant: 'outline', col: 7, span: 6, visible: true },
      { id: uid(), type: 'trust_badges', variant: 'row-3', col: 7, span: 6, visible: true },
      { id: uid(), type: 'description', variant: 'plain', col: 7, span: 6, visible: true },
      { id: uid(), type: 'sizes_selector', variant: 'chips', col: 7, span: 6, visible: true },
      { id: uid(), type: 'quantity_selector', col: 7, span: 6, visible: true },
      { id: uid(), type: 'cta_add_to_cart', variant: 'bold-block', col: 7, span: 6, visible: true },
      { id: uid(), type: 'related_products', col: 1, span: 12, visible: true },
    ],
  },
};

export const MINIMAL_PRESET: PageTemplate = {
  name: 'Minimal',
  slug: 'minimal',
  type: 'product',
  previewImage: minimalImg,
  theme: {
    colors: { bg: '#ffffff', fg: '#0a0a0a', primary: '#0a0a0a', accent: '#0a0a0a', muted: '#737373', card: '#ffffff', border: '#e5e5e5' },
    fontHeading: 'Inter', fontBody: 'Inter',
    radius: '4px', shadow: 'none', spacing: 24,
  },
  layout: {
    grid: { cols: 12, gap: 32 },
    blocks: [
      { id: uid(), type: 'gallery', variant: 'carousel-fullbleed', col: 1, span: 12 },
      { id: uid(), type: 'title', col: 4, span: 6 },
      { id: uid(), type: 'price', variant: 'inline-strike', col: 4, span: 6 },
      { id: uid(), type: 'sizes_selector', variant: 'compact-pill', col: 4, span: 6 },
      { id: uid(), type: 'cta_add_to_cart', variant: 'outline-minimal', col: 4, span: 6 },
      { id: uid(), type: 'description', variant: 'plain', col: 4, span: 6 },
    ],
  },
};

export const CLASSIC_PRESET: PageTemplate = {
  name: 'Boutique Classique',
  slug: 'classic',
  type: 'product',
  previewImage: classicImg,
  theme: {
    colors: { bg: '#ffffff', fg: '#0a0a0a', primary: '#0a0a0a', accent: '#e63c2f', muted: '#737373', card: '#ffffff', border: '#e5e5e5' },
    fontHeading: 'Inter', fontBody: 'Inter',
    radius: '8px', shadow: '0 2px 8px rgba(0,0,0,0.06)', spacing: 16,
  },
  layout: {
    grid: { cols: 12, gap: 24 },
    blocks: [
      { id: uid(), type: 'gallery', variant: 'classic-thumbs-left', col: 1, span: 6 },
      { id: uid(), type: 'title', col: 7, span: 6 },
      { id: uid(), type: 'price', variant: 'large-bold', col: 7, span: 6 },
      { id: uid(), type: 'description', variant: 'plain', col: 7, span: 6 },
      { id: uid(), type: 'sizes_selector', variant: 'chips', col: 7, span: 6 },
      { id: uid(), type: 'quantity_selector', col: 7, span: 6 },
      { id: uid(), type: 'cta_add_to_cart', variant: 'bold-block', col: 7, span: 6 },
      { id: uid(), type: 'trust_badges', variant: 'row-3', col: 7, span: 6 },
      { id: uid(), type: 'related_products', col: 1, span: 12 },
    ],
  },
};

export const MAGAZINE_PRESET: PageTemplate = {
  name: 'Magazine',
  slug: 'magazine',
  type: 'product',
  previewImage: magazineImg,
  theme: {
    colors: { bg: '#fafaf7', fg: '#1a1a1a', primary: '#1a1a1a', accent: '#c9a84c', muted: '#888888', card: '#ffffff', border: '#e8e8e8' },
    fontHeading: 'Cormorant Garamond', fontBody: 'Inter',
    font: "'Cormorant Garamond', serif", radius: '0px', shadow: 'none', spacing: 32,
  },
  layout: {
    grid: { cols: 12, gap: 48 },
    blocks: [
      { id: uid(), type: 'gallery', variant: 'grid-2x2', col: 1, span: 8 },
      { id: uid(), type: 'category_tag', col: 9, span: 4 },
      { id: uid(), type: 'title', col: 9, span: 4 },
      { id: uid(), type: 'price', variant: 'large-bold', col: 9, span: 4 },
      { id: uid(), type: 'description', variant: 'magazine-drop-cap', col: 9, span: 4 },
      { id: uid(), type: 'sizes_selector', variant: 'dropdown', col: 9, span: 4 },
      { id: uid(), type: 'cta_add_to_cart', variant: 'outline-minimal', col: 9, span: 4 },
    ],
  },
};

export const EDITORIAL_PRESET: PageTemplate = {
  name: 'Editorial',
  slug: 'editorial',
  type: 'product',
  previewImage: editorialImg,
  theme: {
    colors: { bg: '#0f0f0f', fg: '#f5f5f5', primary: '#f5f5f5', accent: '#d4af37', muted: '#a0a0a0', card: '#1a1a1a', border: '#2a2a2a' },
    fontHeading: 'Playfair Display', fontBody: 'Inter',
    radius: '0px', shadow: 'none', spacing: 24,
  },
  layout: {
    grid: { cols: 12, gap: 32 },
    blocks: [
      { id: uid(), type: 'gallery', variant: 'carousel-fullbleed', col: 1, span: 12 },
      { id: uid(), type: 'category_tag', col: 1, span: 6 },
      { id: uid(), type: 'title', col: 1, span: 12, props: { size: 56 } },
      { id: uid(), type: 'price', variant: 'large-bold', col: 1, span: 4 },
      { id: uid(), type: 'description', variant: 'plain', col: 1, span: 8 },
      { id: uid(), type: 'sizes_selector', variant: 'chips', col: 1, span: 6 },
      { id: uid(), type: 'cta_add_to_cart', variant: 'gradient', col: 1, span: 12 },
    ],
  },
};

export const SHOWROOM_PRESET: PageTemplate = {
  name: 'Showroom',
  slug: 'showroom',
  type: 'product',
  previewImage: showroomImg,
  theme: {
    colors: { bg: '#111111', fg: '#ffffff', primary: '#d4a142', accent: '#d4a142', muted: '#999999', card: '#1c1c1c', border: '#333333' },
    fontHeading: 'Manrope', fontBody: 'Manrope',
    radius: '16px', shadow: '0 20px 60px rgba(212,161,66,0.15)', spacing: 24,
  },
  layout: {
    grid: { cols: 12, gap: 40 },
    blocks: [
      { id: uid(), type: 'gallery', variant: 'masonry', col: 1, span: 7 },
      { id: uid(), type: 'category_tag', col: 8, span: 5 },
      { id: uid(), type: 'title', col: 8, span: 5, props: { uppercase: true, size: 40 } },
      { id: uid(), type: 'price', variant: 'badge-discount', col: 8, span: 5 },
      { id: uid(), type: 'description', variant: 'bullet-features', col: 8, span: 5 },
      { id: uid(), type: 'trust_badges', variant: 'icons-only', col: 8, span: 5 },
      { id: uid(), type: 'sizes_selector', variant: 'grid-bordered', col: 8, span: 5 },
      { id: uid(), type: 'cta_add_to_cart', variant: 'split-buy-now', col: 8, span: 5 },
    ],
  },
};

export const TEMPLATE_PRESETS: PageTemplate[] = [
  BUGGY_PRESET, MINIMAL_PRESET, CLASSIC_PRESET, MAGAZINE_PRESET, EDITORIAL_PRESET, SHOWROOM_PRESET,
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
