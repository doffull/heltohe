import type { TechwearHeroConfig, TechwearHeroSlideData } from '@/types';
import { DEFAULT_TECHWEAR_HERO } from '@/config/homeConfig';

const SLIDE_KEYS: (keyof TechwearHeroSlideData)[] = [
  'productId', 'modelBadge', 'ctaPrimary', 'ctaSecondary', 'stats',
  'visibleSizes', 'defaultSize', 'colorOptions', 'defaultColor',
  'imageFit', 'imagePosition', 'showStats', 'showColors', 'showSizes',
  'showModelBadge', 'background', 'cardSize', 'imageOverflow',
];

function uid() {
  return 'slide_' + Math.random().toString(36).slice(2, 10);
}

/** Build a slide object from the top-level (legacy) cfg fields. */
export function slideFromLegacy(cfg: TechwearHeroConfig): TechwearHeroSlideData {
  const s: any = { id: uid(), name: 'Slide 1' };
  for (const k of SLIDE_KEYS) s[k] = (cfg as any)[k];
  return s as TechwearHeroSlideData;
}

/** Always returns at least one slide. */
export function getSlides(cfg: TechwearHeroConfig): TechwearHeroSlideData[] {
  if (Array.isArray(cfg.slides) && cfg.slides.length > 0) return cfg.slides;
  return [slideFromLegacy(cfg)];
}

export function makeEmptySlide(name?: string): TechwearHeroSlideData {
  const d = DEFAULT_TECHWEAR_HERO;
  return {
    id: uid(),
    name: name || 'Nouvelle slide',
    productId: d.productId,
    modelBadge: { ...d.modelBadge },
    ctaPrimary: { ...d.ctaPrimary },
    ctaSecondary: { ...d.ctaSecondary },
    stats: d.stats.map((x) => ({ ...x })),
    visibleSizes: [...d.visibleSizes],
    defaultSize: d.defaultSize,
    colorOptions: d.colorOptions.map((c) => ({ ...c })),
    defaultColor: d.defaultColor,
    imageFit: d.imageFit,
    imagePosition: d.imagePosition,
    showStats: d.showStats,
    showColors: d.showColors,
    showSizes: d.showSizes,
    showModelBadge: d.showModelBadge,
    background: d.background ? { ...d.background } : undefined,
    cardSize: d.cardSize,
    imageOverflow: d.imageOverflow,
  };
}

export function duplicateSlide(s: TechwearHeroSlideData): TechwearHeroSlideData {
  return JSON.parse(JSON.stringify({ ...s, id: uid(), name: (s.name || 'Slide') + ' (copie)' }));
}
