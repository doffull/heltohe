// Extraction des images réellement embarquées dans un PDF (et non des captures
// de page). Chaque image est reconvertie en JPEG puis classée :
//   - "ghost" : packshot détouré sur fond blanc
//   - "worn"  : visuel porté / mise en scène (image principale)
import { getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

export type EmbeddedKind = "ghost" | "worn";

export interface EmbeddedImage {
  page: number;
  index: number;
  kind: EmbeddedKind;
  width: number;
  height: number;
  bytes: Uint8Array;
  fingerprint: string;
  whiteRatio: number;
  area: number;
}

const MIN_SIDE = 200;
const MAX_DIM = 1400;
const JPEG_QUALITY = 82;
const MAX_PER_PAGE = 6;
const MAX_RATIO = 4; // bandeaux / filets décoratifs
const WHITE_THRESHOLD = 240;
const GHOST_BORDER_RATIO = 0.82;

/** Convertit un bitmap brut pdf.js (kind 1/2/3) en Image RGBA imagescript. */
function toRgbaImage(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  kind: number,
): Image | null {
  const img = new Image(width, height);
  const out = img.bitmap; // Uint8ClampedArray RGBA

  if (kind === 3) {
    if (data.length < width * height * 4) return null;
    out.set(data.subarray(0, width * height * 4));
    return img;
  }

  if (kind === 2) {
    if (data.length < width * height * 3) return null;
    for (let i = 0, o = 0, s = 0; i < width * height; i++, o += 4, s += 3) {
      out[o] = data[s];
      out[o + 1] = data[s + 1];
      out[o + 2] = data[s + 2];
      out[o + 3] = 255;
    }
    return img;
  }

  if (kind === 1) {
    // 1 bit par pixel, lignes alignées sur l'octet
    const rowBytes = (width + 7) >> 3;
    if (data.length < rowBytes * height) return null;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bit = (data[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;
        const v = bit ? 255 : 0;
        const o = (y * width + x) * 4;
        out[o] = v;
        out[o + 1] = v;
        out[o + 2] = v;
        out[o + 3] = 255;
      }
    }
    return img;
  }

  return null;
}

/** Proportion de pixels quasi-blancs sur le pourtour de l'image. */
function borderWhiteRatio(img: Image): number {
  const { width, height, bitmap } = img;
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.06));
  let white = 0;
  let total = 0;
  const step = Math.max(1, Math.round(Math.min(width, height) / 160));

  const sample = (x: number, y: number) => {
    const o = (y * width + x) * 4;
    total++;
    if (bitmap[o] >= WHITE_THRESHOLD && bitmap[o + 1] >= WHITE_THRESHOLD && bitmap[o + 2] >= WHITE_THRESHOLD) white++;
    // Un fond transparent compte aussi comme détouré
    else if (bitmap[o + 3] < 24) white++;
  };

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < band && x < width; x += step) sample(x, y);
    for (let x = Math.max(0, width - band); x < width; x += step) sample(x, y);
  }
  for (let x = 0; x < width; x += step) {
    for (let y = 0; y < band && y < height; y += step) sample(x, y);
    for (let y = Math.max(0, height - band); y < height; y += step) sample(x, y);
  }

  return total === 0 ? 0 : white / total;
}

function classify(whiteRatio: number): EmbeddedKind {
  return whiteRatio >= GHOST_BORDER_RATIO ? "ghost" : "worn";
}

/** Récupère un objet image pdf.js (page.objs ou commonObjs) de façon tolérante. */
// deno-lint-ignore no-explicit-any
function resolveObj(store: any, id: string): Promise<any> {
  return new Promise((resolve) => {
    try {
      if (!store) return resolve(null);
      if (typeof store.has === "function" && !store.has(id)) return resolve(null);
      if (typeof store.get === "function") {
        // pdf.js accepte un callback quand l'objet n'est pas encore résolu
        try {
          const direct = store.get(id);
          if (direct) return resolve(direct);
        } catch {
          // ignore : on tente la version callback
        }
        try {
          store.get(id, (v: unknown) => resolve(v ?? null));
          setTimeout(() => resolve(null), 4000);
          return;
        } catch {
          return resolve(null);
        }
      }
      resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Extrait les images embarquées des pages 1..maxPage.
 * Retourne une map page -> images (JPEG prêtes à uploader).
 * Ne lève jamais : en cas d'échec, la map est simplement vide/partielle.
 */
export async function extractEmbeddedImages(
  pdfBytes: Uint8Array,
  maxPage: number,
): Promise<Map<number, EmbeddedImage[]>> {
  const result = new Map<number, EmbeddedImage[]>();
  if (maxPage <= 0) return result;

  // deno-lint-ignore no-explicit-any
  let doc: any = null;
  try {
    doc = await getDocumentProxy(pdfBytes);
  } catch (e) {
    console.warn("extractEmbeddedImages: getDocumentProxy failed:", (e as Error).message);
    return result;
  }

  const pageCount = Math.min(doc?.numPages ?? 0, maxPage);
  // Empreinte -> nombre de pages où elle apparaît (logos, filigranes…)
  const fingerprintPages = new Map<string, Set<number>>();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    try {
      const page = await doc.getPage(pageNumber);
      const ops = await page.getOperatorList();
      const ids: string[] = [];
      for (const args of ops?.argsArray ?? []) {
        const first = Array.isArray(args) ? args[0] : null;
        if (typeof first === "string" && (first.startsWith("img_") || first.startsWith("g_"))) {
          if (!ids.includes(first)) ids.push(first);
        }
      }

      const images: EmbeddedImage[] = [];
      for (const id of ids) {
        if (images.length >= MAX_PER_PAGE) break;
        const obj = (await resolveObj(page.objs, id)) ?? (await resolveObj(doc?.commonObjs, id));
        if (!obj) continue;
        const width = Number(obj.width ?? 0);
        const height = Number(obj.height ?? 0);
        const data = obj.data as Uint8Array | undefined;
        if (!width || !height || !data) continue;
        if (Math.min(width, height) < MIN_SIDE) continue;
        if (Math.max(width, height) / Math.min(width, height) > MAX_RATIO) continue;

        const kind = Number(obj.kind ?? 0) || (data.length >= width * height * 4 ? 3 : 2);
        const rgba = toRgbaImage(data, width, height, kind);
        if (!rgba) continue;

        const whiteRatio = borderWhiteRatio(rgba);
        const longest = Math.max(rgba.width, rgba.height);
        if (longest > MAX_DIM) {
          const ratio = MAX_DIM / longest;
          rgba.resize(Math.round(rgba.width * ratio), Math.round(rgba.height * ratio));
        }
        const jpeg = new Uint8Array(await rgba.encodeJPEG(JPEG_QUALITY));
        const fingerprint = `${width}x${height}:${data.length}`;

        images.push({
          page: pageNumber,
          index: images.length,
          kind: classify(whiteRatio),
          width,
          height,
          bytes: jpeg,
          fingerprint,
          whiteRatio,
          area: width * height,
        });

        if (!fingerprintPages.has(fingerprint)) fingerprintPages.set(fingerprint, new Set());
        fingerprintPages.get(fingerprint)!.add(pageNumber);
      }

      if (images.length > 0) result.set(pageNumber, images);
      // libère les ressources pdf.js de la page
      try { page.cleanup?.(); } catch { /* noop */ }
    } catch (e) {
      console.warn(`extractEmbeddedImages: page ${pageNumber} failed:`, (e as Error).message);
    }
  }

  // Retire les visuels répétés sur la majorité des pages (logos, gabarits)
  if (pageCount >= 3) {
    const repeatLimit = Math.max(2, Math.ceil(pageCount * 0.6));
    for (const [pageNumber, list] of result) {
      const filtered = list.filter((im) => (fingerprintPages.get(im.fingerprint)?.size ?? 1) < repeatLimit);
      if (filtered.length > 0) result.set(pageNumber, filtered);
      else result.delete(pageNumber);
    }
  }

  // Tri : visuels portés d'abord, puis par surface décroissante
  for (const list of result.values()) {
    list.sort((a, b) => (a.kind === b.kind ? b.area - a.area : a.kind === "worn" ? -1 : 1));
  }

  return result;
}
