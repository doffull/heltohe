/**
 * Home feed sections — configurable product sections rendered on the homepage.
 *
 * Each section is a homepage block whose id is `feed:<id>`, so it plugs into the
 * existing `homePageBlocks` ordering/visibility system used by both the desktop
 * admin and the mobile live editor (single source of truth).
 *
 * Filling strategy (hybrid, per the product brief):
 *  1. manual curation wins  → designSettings.homeSectionProducts[<id>]
 *  2. otherwise tags        → product.tags includes one of `tags`
 *  3. otherwise categories  → product.category matches one of `categories`
 *  4. otherwise             → nothing is rendered (section auto-hides)
 */

export interface FeedSectionConfig {
  id: string;
  title: string;
  /** Small mono label above the title ("// TENDANCE") */
  eyebrow: string;
  /** Tags used for automatic filling */
  tags: string[];
  /** Category names / keywords used for automatic filling */
  categories: string[];
  limit: number;
  colsMobile: 1 | 2 | 3;
  colsDesktop: 2 | 3 | 4 | 5;
  /** grid = wraps, carousel = horizontal scroll (better on mobile) */
  layout: 'grid' | 'carousel';
  /** Optional link for the "Tout voir" button */
  href?: string;
  bg?: 'default' | 'muted';
}

export const DEFAULT_FEED_SECTIONS: FeedSectionConfig[] = [
  {
    id: 'trending',
    title: 'Tendance',
    eyebrow: '// TENDANCE',
    tags: ['trending', 'tendance'],
    categories: [],
    limit: 8,
    colsMobile: 2,
    colsDesktop: 4,
    layout: 'carousel',
    href: '/boutique',
    bg: 'default',
  },
  {
    id: 'cagoule',
    title: 'Cagoules',
    eyebrow: '// CAGOULE',
    tags: ['cagoule'],
    categories: ['Cagoule', 'Cagoules'],
    limit: 8,
    colsMobile: 2,
    colsDesktop: 4,
    layout: 'carousel',
    href: '/boutique',
    bg: 'muted',
  },
  {
    id: 'sans-manche',
    title: 'Sans manche',
    eyebrow: '// SANS MANCHE',
    tags: ['sans-manche', 'sansmanche'],
    categories: ['Sans manche', 'Sans manches'],
    limit: 8,
    colsMobile: 2,
    colsDesktop: 4,
    layout: 'carousel',
    href: '/boutique',
    bg: 'default',
  },
  {
    id: 'veste',
    title: 'Vestes',
    eyebrow: '// VESTE',
    tags: ['veste'],
    categories: ['Veste', 'Vestes'],
    limit: 8,
    colsMobile: 2,
    colsDesktop: 4,
    layout: 'carousel',
    href: '/boutique',
    bg: 'muted',
  },
  {
    id: 'survetement',
    title: 'Survêtements',
    eyebrow: '// SURVÊTEMENT',
    tags: ['survetement', 'survêtement'],
    categories: ['Survêtement', 'Survetement', 'Survêtements'],
    limit: 8,
    colsMobile: 2,
    colsDesktop: 4,
    layout: 'carousel',
    href: '/boutique',
    bg: 'default',
  },
];

export const FEED_BLOCK_PREFIX = 'feed:';

export function feedBlockId(id: string) {
  return `${FEED_BLOCK_PREFIX}${id}`;
}

/** Merge the saved config with the defaults so newly shipped sections appear. */
export function resolveFeedSections(saved: unknown): FeedSectionConfig[] {
  const list = Array.isArray(saved) ? (saved as FeedSectionConfig[]) : [];
  const out: FeedSectionConfig[] = list
    .filter((s) => s && typeof s.id === 'string')
    .map((s) => ({ ...DEFAULT_FEED_SECTIONS.find((d) => d.id === s.id), ...s }) as FeedSectionConfig);
  DEFAULT_FEED_SECTIONS.forEach((d) => {
    if (!out.find((s) => s.id === d.id)) out.push({ ...d });
  });
  return out;
}
