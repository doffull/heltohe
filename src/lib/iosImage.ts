/**
 * Helpers iOS / Safari pour les médias.
 *
 * Deux problèmes récurrents sur iPhone :
 *  1. Les photos prises par un iPhone sont en HEIC/HEIF — illisibles par
 *     Chrome, Android et la plupart des navigateurs. On les convertit en JPEG
 *     avant l'upload.
 *  2. WebKit refuse de décoder les très grandes images (limite mémoire par
 *     onglet) : l'image reste blanche. On redimensionne donc à 2400px max.
 */

const MAX_EDGE = 2400;
const JPEG_QUALITY = 0.86;

/** Normalise une URL média pour éviter le contenu mixte bloqué par iOS. */
export function normalizeMediaSrc(src: unknown): string | undefined {
  if (typeof src !== 'string' || src.trim() === '') return undefined;
  const url = src.trim();
  // Safari bloque le HTTP dans une page HTTPS : on tente la version sécurisée.
  if (url.startsWith('http://') && typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return `https://${url.slice('http://'.length)}`;
  }
  return url;
}

function isHeic(file: File) {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

async function loadBitmap(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void } | null> {
  // createImageBitmap gère HEIC sur iOS Safari (décodeur système).
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      return {
        width: bmp.width,
        height: bmp.height,
        draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h),
      };
    } catch {
      /* on retombe sur <img> */
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Convertit (HEIC → JPEG) et redimensionne si nécessaire.
 * Retourne le fichier d'origine si aucune transformation n'est utile ou possible.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (typeof document === 'undefined') return file;
  if (!file.type.startsWith('image/') && !isHeic(file)) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  const heic = isHeic(file);
  const bitmap = await loadBitmap(file);
  if (!bitmap || !bitmap.width || !bitmap.height) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (!heic && scale === 1) return file;

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  bitmap.draw(ctx, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) return file;

  const name = file.name.replace(/\.(heic|heif|png|webp|jpe?g)$/i, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}
