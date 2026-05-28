// Catalog of variants per block type. Variant id is stored on TemplateBlock.variant.
import type { BlockType } from './templatePresets';

export interface VariantOption {
  id: string;
  label: string;
  description?: string;
}

export const BLOCK_VARIANTS: Partial<Record<BlockType, VariantOption[]>> = {
  gallery: [
    { id: 'classic-thumbs-left', label: 'Classique (miniatures à gauche)' },
    { id: 'grid-2x2', label: 'Grille 2x2' },
    { id: 'carousel-fullbleed', label: 'Carrousel pleine largeur' },
    { id: 'masonry', label: 'Mosaïque' },
    { id: 'slider-dots', label: 'Slider avec points' },
  ],
  description: [
    { id: 'plain', label: 'Texte simple' },
    { id: 'accordion', label: 'Accordéon' },
    { id: 'tabs', label: 'Onglets' },
    { id: 'bullet-features', label: 'Liste à puces' },
    { id: 'magazine-drop-cap', label: 'Magazine (lettrine)' },
  ],
  find_size_btn: [
    { id: 'outline', label: 'Outline' },
    { id: 'pill-icon', label: 'Pill + icône' },
    { id: 'link-underline', label: 'Lien souligné' },
    { id: 'modal-cta', label: 'CTA modal' },
  ],
  cta_add_to_cart: [
    { id: 'bold-block', label: 'Bloc audacieux' },
    { id: 'outline-minimal', label: 'Outline minimal' },
    { id: 'gradient', label: 'Dégradé' },
    { id: 'sticky-bottom', label: 'Sticky bas d\'écran' },
    { id: 'split-buy-now', label: 'Split + Acheter maintenant' },
  ],
  sizes_selector: [
    { id: 'chips', label: 'Chips' },
    { id: 'dropdown', label: 'Liste déroulante' },
    { id: 'grid-bordered', label: 'Grille bordée' },
    { id: 'compact-pill', label: 'Pills compactes' },
  ],
  price: [
    { id: 'large-bold', label: 'Grand & gras' },
    { id: 'inline-strike', label: 'Inline avec barré' },
    { id: 'badge-discount', label: 'Badge promo' },
    { id: 'subscription-split', label: 'Découpé (4x)' },
  ],
  trust_badges: [
    { id: 'row-3', label: '3 colonnes' },
    { id: 'icons-only', label: 'Icônes seules' },
    { id: 'stacked-list', label: 'Liste empilée' },
    { id: 'marquee', label: 'Bandeau défilant' },
  ],
};

export const GOOGLE_FONTS = [
  'Inter', 'Manrope', 'Poppins', 'Montserrat', 'Roboto', 'Work Sans',
  'Playfair Display', 'Cormorant Garamond', 'DM Serif Display', 'Lora',
  'Space Grotesk', 'Bebas Neue', 'Archivo Black', 'Oswald', 'Syne',
];

export function loadGoogleFont(family: string) {
  if (!family || typeof document === 'undefined') return;
  const id = `gf-${family.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}
