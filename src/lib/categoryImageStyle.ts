import type { CSSProperties } from 'react';

export type CategoryCoverMode = 'cover' | 'contain' | 'fill';

export interface CategoryFraming {
  coverMode?: string;
  coverPosition?: string;
  coverZoom?: number;
  coverBg?: string;
}

export const DEFAULT_FRAMING: Required<CategoryFraming> = {
  coverMode: 'cover',
  coverPosition: '50% 50%',
  coverZoom: 1,
  coverBg: '',
};

function normalizeMode(mode?: string): CategoryCoverMode {
  return mode === 'contain' || mode === 'fill' ? mode : 'cover';
}

/**
 * Inline styles to apply to the <img> of a category (grid card or page banner)
 * so admin framing settings (mode, focal point, zoom) are honoured everywhere.
 */
export function categoryImageStyle(cat: CategoryFraming | undefined | null): CSSProperties {
  const mode = normalizeMode(cat?.coverMode);
  const position = cat?.coverPosition || DEFAULT_FRAMING.coverPosition;
  const zoom = Math.max(1, Math.min(3, Number(cat?.coverZoom) || 1));
  return {
    objectFit: mode,
    objectPosition: position,
    transform: zoom !== 1 ? `scale(${zoom})` : undefined,
    transformOrigin: position,
  };
}

/** Background color behind the image (visible in `contain` mode). */
export function categoryImageBackground(cat: CategoryFraming | undefined | null): CSSProperties {
  const mode = normalizeMode(cat?.coverMode);
  if (mode === 'contain' && cat?.coverBg) return { backgroundColor: cat.coverBg };
  return {};
}

export const COVER_MODE_OPTIONS: Array<{ value: CategoryCoverMode; label: string; hint: string }> = [
  { value: 'cover', label: 'Cover', hint: 'Remplit le cadre, les bords sont recadrés' },
  { value: 'contain', label: 'Contain', hint: 'Image entière visible, marges possibles' },
  { value: 'fill', label: 'Fill', hint: 'Étire l’image pour remplir (déformation)' },
];

/** 3x3 focal grid values. */
export const FOCAL_PRESETS: Array<{ value: string; label: string }> = [
  { value: '0% 0%', label: 'Haut gauche' },
  { value: '50% 0%', label: 'Haut centre' },
  { value: '100% 0%', label: 'Haut droite' },
  { value: '0% 50%', label: 'Milieu gauche' },
  { value: '50% 50%', label: 'Centre' },
  { value: '100% 50%', label: 'Milieu droite' },
  { value: '0% 100%', label: 'Bas gauche' },
  { value: '50% 100%', label: 'Bas centre' },
  { value: '100% 100%', label: 'Bas droite' },
];

export function parsePosition(pos?: string): { x: number; y: number } {
  const m = (pos || DEFAULT_FRAMING.coverPosition).match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);
  if (!m) return { x: 50, y: 50 };
  return { x: Number(m[1]), y: Number(m[2]) };
}

export function formatPosition(x: number, y: number): string {
  return `${Math.round(x)}% ${Math.round(y)}%`;
}
