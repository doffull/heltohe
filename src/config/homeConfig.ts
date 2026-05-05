import type { TechwearHeroConfig } from '@/types';

// Default config used as a fallback when DB has nothing yet.
export const DEFAULT_TECHWEAR_HERO: TechwearHeroConfig = {
  enabled: false,
  productId: null,
  modelBadge: { line1: 'MODEL', line2: '0.1.2' },
  ctaPrimary:   { label: 'SHOP NOW',          href: '/boutique' },
  ctaSecondary: { label: 'EXPLORE COLLECTION', href: '/boutique' },
  stats: [
    { label: 'Price',      value: 85 },
    { label: 'Durability', value: 90 },
    { label: 'Fashion',    value: 70 },
  ],
  visibleSizes: ['M', 'L'],
  defaultSize: 'M',
  colorOptions: [
    { name: 'Black', hex: '#1A1A1A', image: '/assets/home/model-black.png' },
    { name: 'White', hex: '#F5F5F5', image: '/assets/home/model-white.png' },
    { name: 'Gray',  hex: '#888888', image: '/assets/home/model-gray.png'  },
  ],
  defaultColor: 1,
  imageFit: 'cover',
  imagePosition: 'center',
  showStats: true,
  showColors: true,
  showSizes: true,
  showModelBadge: true,
};

// Back-compat export (old name still imported elsewhere)
export const HOME_CONFIG = {
  modelBadge: DEFAULT_TECHWEAR_HERO.modelBadge,
  ctaPrimary: DEFAULT_TECHWEAR_HERO.ctaPrimary,
  ctaSecondary: DEFAULT_TECHWEAR_HERO.ctaSecondary,
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const,
  defaultSize: DEFAULT_TECHWEAR_HERO.defaultSize,
  visibleSizes: DEFAULT_TECHWEAR_HERO.visibleSizes,
  colorOptions: DEFAULT_TECHWEAR_HERO.colorOptions,
  defaultColor: DEFAULT_TECHWEAR_HERO.defaultColor,
  stats: DEFAULT_TECHWEAR_HERO.stats,
};
