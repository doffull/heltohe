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

/* ------------------------------------------------------------------ *
 * Détection iOS / WebKit et stratégie de chargement des images
 * ------------------------------------------------------------------ */

let cachedIsIOS: boolean | null = null;

/**
 * `true` sur iPhone/iPad (y compris iPadOS qui se déclare « Macintosh ») et
 * sur tout Safari de bureau, qui partage le même décodeur WebKit.
 */
export function isAppleWebKit(): boolean {
  if (cachedIsIOS !== null) return cachedIsIOS;
  if (typeof navigator === 'undefined') return (cachedIsIOS = false);
  const ua = navigator.userAgent || '';
  const touch = (navigator as any).maxTouchPoints || 0;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  const desktopSafari = /Safari\//.test(ua) && !/Chrome|Chromium|Edg\/|OPR\//.test(ua);
  return (cachedIsIOS = iOS || desktopSafari);
}

export interface ImageLoadStrategy {
  loading: 'eager' | 'lazy';
  decoding: 'sync' | 'async' | 'auto';
  fetchPriority: 'high' | 'low' | 'auto';
  /** Décoder hors du thread de rendu avant l'affichage (img.decode()). */
  preDecode: boolean;
  /** Nombre de décodages simultanés autorisés. */
  concurrency: number;
}

/**
 * WebKit abandonne les décodages quand trop d'images arrivent en parallèle
 * (« decode failed », image blanche). Sur Safari on limite la concurrence,
 * on décode explicitement avant l'affichage et on évite `decoding="sync"`
 * qui bloque le thread principal.
 */
export function getImageLoadStrategy(opts: { priority?: boolean } = {}): ImageLoadStrategy {
  const apple = isAppleWebKit();
  const priority = !!opts.priority;
  return {
    loading: priority ? 'eager' : 'lazy',
    decoding: 'async',
    fetchPriority: priority ? 'high' : apple ? 'low' : 'auto',
    preDecode: apple,
    concurrency: apple ? 3 : 8,
  };
}

/** File d'attente de décodage — sérialise les `img.decode()` sur WebKit. */
let active = 0;
const queue: Array<() => void> = [];

function release() {
  active = Math.max(0, active - 1);
  const next = queue.shift();
  if (next) {
    active += 1;
    next();
  }
}

/**
 * Décode l'image de façon contrôlée. Résout `true` si le décodage a réussi,
 * `false` si WebKit l'a refusé (l'appelant peut alors réessayer).
 */
export function decodeWhenIdle(img: HTMLImageElement, concurrency: number): Promise<boolean> {
  if (typeof img.decode !== 'function') return Promise.resolve(true);
  return new Promise((resolve) => {
    const run = () => {
      img
        .decode()
        .then(() => resolve(true))
        .catch(() => resolve(false))
        .finally(release);
    };
    if (active < concurrency) {
      active += 1;
      run();
    } else {
      queue.push(run);
    }
  });
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

  // PNG/WebP peuvent contenir de la transparence (logos, détourages) : JPEG
  // n'a pas de canal alpha et aplatirait le fond en noir. On reste en PNG,
  // sauf pour HEIC (toujours opaque, photo iPhone) où JPEG suffit.
  const keepAlpha = !heic && /image\/(png|webp)/i.test(file.type);
  const mime = keepAlpha ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, JPEG_QUALITY),
  );
  if (!blob) return file;

  const ext = keepAlpha ? 'png' : 'jpg';
  const name = file.name.replace(/\.(heic|heif|png|webp|jpe?g)$/i, '') + '.' + ext;
  return new File([blob], name, { type: mime, lastModified: Date.now() });
}
