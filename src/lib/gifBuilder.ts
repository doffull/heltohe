import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export interface GifSettings {
  /** Delay per frame, in ms. */
  delay: number;
  /** Output width in px (height derives from the first image ratio). */
  width: number;
  /** Infinite loop. */
  loop: boolean;
}

export interface GifPreset extends GifSettings {
  id: string;
  name: string;
  asMain: boolean;
  asHover: boolean;
}

export const GIF_DEFAULTS: GifSettings = { delay: 400, width: 600, loop: true };
export const GIF_WIDTH_MIN = 200;
export const GIF_WIDTH_MAX = 2000;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image illisible: ${src}`));
    img.src = src;
  });
}

export function clampWidth(v: number): number {
  if (!Number.isFinite(v)) return GIF_DEFAULTS.width;
  return Math.min(GIF_WIDTH_MAX, Math.max(GIF_WIDTH_MIN, Math.round(v)));
}

/**
 * Encode an animated GIF from a list of image URLs, entirely in the browser.
 * Images are letterboxed on a white background to preserve their ratio.
 */
export async function buildGifBlob(
  images: string[],
  settings: GifSettings,
): Promise<Blob> {
  if (images.length < 2) throw new Error('Au moins 2 images sont nécessaires');

  const loaded = await Promise.all(images.map(loadImage));
  const first = loaded[0];
  const outW = clampWidth(settings.width);
  const outH = Math.max(1, Math.round((first.naturalHeight / first.naturalWidth) * outW));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas indisponible');

  const gif = GIFEncoder();

  loaded.forEach((img, i) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    const scale = Math.min(outW / img.naturalWidth, outH / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (outW - w) / 2, (outH - h) / 2, w, h);

    const { data } = ctx.getImageData(0, 0, outW, outH);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, outW, outH, {
      palette,
      delay: settings.delay,
      ...(i === 0 ? { repeat: settings.loop ? 0 : -1 } : {}),
    });
  });

  gif.finish();
  return new Blob([gif.bytesView()], { type: 'image/gif' });
}
