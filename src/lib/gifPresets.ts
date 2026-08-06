import type { GifPreset, GifSettings } from './gifBuilder';
import { clampWidth, GIF_DEFAULTS } from './gifBuilder';

const LAST_KEY = 'hmp.gif.last';

export interface GifLastUsed extends GifSettings {
  asMain: boolean;
  asHover: boolean;
}

export const GIF_LAST_DEFAULT: GifLastUsed = {
  ...GIF_DEFAULTS,
  asMain: true,
  asHover: false,
};

export function readGifLastUsed(): GifLastUsed {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return GIF_LAST_DEFAULT;
    const p = JSON.parse(raw) as Partial<GifLastUsed>;
    return {
      delay: typeof p.delay === 'number' ? p.delay : GIF_LAST_DEFAULT.delay,
      width: clampWidth(typeof p.width === 'number' ? p.width : GIF_LAST_DEFAULT.width),
      loop: p.loop !== false,
      asMain: p.asMain !== false,
      asHover: Boolean(p.asHover),
    };
  } catch {
    return GIF_LAST_DEFAULT;
  }
}

export function writeGifLastUsed(v: GifLastUsed) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function makePreset(name: string, v: GifLastUsed): GifPreset {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || `Preset ${v.width}px`,
    delay: v.delay,
    width: v.width,
    loop: v.loop,
    asMain: v.asMain,
    asHover: v.asHover,
  };
}
