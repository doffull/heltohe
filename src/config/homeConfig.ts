// ═══════════════════════════════════════════════════════════
// HOME PAGE CONFIGURATION (Techwear Hero)
// Edit this file to customize labels, links, sizes, colors, stats.
// ═══════════════════════════════════════════════════════════

export const HOME_CONFIG = {
  modelBadge: { line1: 'MODEL', line2: '0.1.2' },

  ctaPrimary: { label: 'SHOP NOW', href: '/boutique' },
  ctaSecondary: { label: 'EXPLORE COLLECTION', href: '/boutique' },

  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const,
  defaultSize: 'XS',

  // Active sizes shown stacked in the size panel (max 2 in mock)
  visibleSizes: ['XS', 'XL'] as const,

  colorOptions: [
    { name: 'Black', hex: '#1A1A1A', image: '/assets/home/model-black.png' },
    { name: 'White', hex: '#F5F5F5', image: '/assets/home/model-white.png' },
    { name: 'Gray',  hex: '#888888', image: '/assets/home/model-gray.png'  },
  ],
  defaultColor: 1, // White by default (matches mockup)

  stats: [
    { label: 'Price',      value: 85 },
    { label: 'Durability', value: 90 },
    { label: 'Fashion',    value: 70 },
  ],
};
