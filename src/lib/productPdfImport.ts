import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';

const MAX_PAGES_PER_BATCH = 4;
const MAX_BATCH_BYTES = 6 * 1024 * 1024;

export interface ImportProgress {
  batchIndex: number;
  totalBatches: number;
  productsSoFar: number;
}

export type MainImageSource = 'worn' | 'ghost' | 'page';

export interface ParsedCatalogProduct {
  name?: string;
  price?: number;
  sku?: string;
  /** Tous les visuels retenus (image principale en premier). */
  pageImages?: string[];
  /** Visuel principal détecté (porté de préférence). */
  mainImage?: string | null;
  /** Provenance du visuel principal. */
  mainSource?: MainImageSource | null;
  /** Packshots détourés sur fond blanc. */
  ghostImages?: string[];
  /** Visuels portés / mise en scène. */
  wornImages?: string[];
  [key: string]: unknown;
}


export interface CatalogImportResult {
  products: ParsedCatalogProduct[];
  batchesProcessed: number;
  errors: string[];
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function createPdfPart(source: PDFDocument, pageIndexes: number[]): Promise<Uint8Array> {
  const part = await PDFDocument.create();
  const pages = await part.copyPages(source, pageIndexes);
  pages.forEach((page) => part.addPage(page));
  return part.save({ useObjectStreams: true });
}

async function splitPageRange(source: PDFDocument, pageIndexes: number[]): Promise<Uint8Array[]> {
  const bytes = await createPdfPart(source, pageIndexes);
  if (bytes.length <= MAX_BATCH_BYTES) return [bytes];

  if (pageIndexes.length === 1) {
    throw new Error(
      `La page ${pageIndexes[0] + 1} dépasse 7 Mo à elle seule. Compressez les images de cette page puis réessayez.`,
    );
  }

  const middle = Math.ceil(pageIndexes.length / 2);
  const left = await splitPageRange(source, pageIndexes.slice(0, middle));
  const right = await splitPageRange(source, pageIndexes.slice(middle));
  return [...left, ...right];
}

async function splitPdf(file: File): Promise<Uint8Array[]> {
  const source = await PDFDocument.load(await file.arrayBuffer());
  const parts: Uint8Array[] = [];

  for (let start = 0; start < source.getPageCount(); start += MAX_PAGES_PER_BATCH) {
    const end = Math.min(start + MAX_PAGES_PER_BATCH, source.getPageCount());
    const indexes = Array.from({ length: end - start }, (_, index) => start + index);
    parts.push(...await splitPageRange(source, indexes));
  }

  return parts;
}

async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response } | null)?.context;
  if (context) {
    const payload = await context.clone().json().catch(() => null) as { error?: string } | null;
    if (payload?.error) return payload.error;
  }
  return error instanceof Error ? error.message : 'Erreur inconnue';
}

const MAX_IMAGES = 6;

function uniq(...lists: (string[] | undefined)[]): string[] {
  const out: string[] = [];
  for (const list of lists) {
    for (const u of list ?? []) {
      if (u && !out.includes(u)) out.push(u);
      if (out.length >= MAX_IMAGES) return out;
    }
  }
  return out;
}

/** Normalise les visuels d'un produit extrait (image principale en tête). */
function normalizeProduct(product: ParsedCatalogProduct): ParsedCatalogProduct {
  const worn = Array.isArray(product.wornImages) ? product.wornImages.filter(Boolean) : [];
  const ghosts = Array.isArray(product.ghostImages) ? product.ghostImages.filter(Boolean) : [];
  const pages = Array.isArray(product.pageImages) ? product.pageImages.filter(Boolean) : [];
  const mainImage = product.mainImage || worn[0] || ghosts[0] || pages[0] || null;
  const mainSource: MainImageSource | null =
    (product.mainSource as MainImageSource | undefined) ??
    (worn.includes(mainImage as string)
      ? 'worn'
      : ghosts.includes(mainImage as string)
        ? 'ghost'
        : mainImage
          ? 'page'
          : null);
  return {
    ...product,
    mainImage,
    mainSource,
    wornImages: worn,
    ghostImages: ghosts,
    pageImages: uniq(mainImage ? [mainImage] : [], worn, ghosts, pages),
  };
}

/** Fusionne deux extractions d'un même produit (lots différents). */
function mergeProducts(existing: ParsedCatalogProduct, incoming: ParsedCatalogProduct): ParsedCatalogProduct {
  const a = normalizeProduct(existing);
  const b = normalizeProduct(incoming);
  const worn = uniq(a.wornImages, b.wornImages);
  const ghosts = uniq(a.ghostImages, b.ghostImages);
  const mainImage = a.mainSource === 'worn' ? a.mainImage : (b.mainSource === 'worn' ? b.mainImage : a.mainImage || b.mainImage);
  return {
    ...a,
    ...b,
    mainImage,
    mainSource: worn.includes(mainImage as string) ? 'worn' : ghosts.includes(mainImage as string) ? 'ghost' : mainImage ? 'page' : null,
    wornImages: worn,
    ghostImages: ghosts,
    pageImages: uniq(mainImage ? [mainImage] : [], worn, ghosts, a.pageImages, b.pageImages),
  };
}


export async function importProductsFromPdf(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
): Promise<CatalogImportResult> {
  const pdfParts = await splitPdf(file);
  const products: ParsedCatalogProduct[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  onProgress?.({ batchIndex: 0, totalBatches: pdfParts.length, productsSoFar: 0 });

  for (let index = 0; index < pdfParts.length; index += 1) {
    const fileBase64 = bytesToBase64(pdfParts[index]);
    const { data, error } = await supabase.functions.invoke('parse-products-pdf', {
      body: { fileBase64, fileType: 'pdf' },
    });

    if (error) {
      errors.push(`Lot ${index + 1}/${pdfParts.length} : ${await readFunctionError(error)}`);
      continue;
    }
    if (data?.error) {
      errors.push(`Lot ${index + 1}/${pdfParts.length} : ${data.error}`);
      continue;
    }

    const batchProducts = Array.isArray(data?.products) ? data.products : [];
    for (const product of batchProducts as ParsedCatalogProduct[]) {
      const key = String(product.sku || `${product.name || ''}-${product.price ?? ''}`).trim().toUpperCase();
      if (!key) continue;
      const existingIndex = products.findIndex((p) => {
        const k = String(p.sku || `${p.name || ''}-${p.price ?? ''}`).trim().toUpperCase();
        return k === key;
      });
      if (existingIndex >= 0) {
        products[existingIndex] = mergeProducts(products[existingIndex], product);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      products.push(normalizeProduct(product));
    }

    onProgress?.({ batchIndex: index + 1, totalBatches: pdfParts.length, productsSoFar: products.length });
  }

  if (products.length === 0 && errors.length > 0) {
    throw new Error(errors[0]);
  }

  return { products, batchesProcessed: pdfParts.length, errors };
}