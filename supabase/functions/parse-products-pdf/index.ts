import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy, renderPageAsImage } from "https://esm.sh/unpdf@0.12.1";
// Pure-JS image codec (no native deps) used to downscale & re-encode
// rendered PDF pages as JPEG before shipping them to the AI.
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { getAiModel } from "../_shared/gemini.ts";
import { extractEmbeddedImages, type EmbeddedImage, type EmbeddedKind } from "./embeddedImages.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE = 18 * 1024 * 1024;
const MAX_MULTIMODAL_SIZE = 12 * 1024 * 1024;
const PAGE_RENDER_SCALE = 1.0;
const PAGE_MAX_DIM = 1100;
const PAGE_JPEG_QUALITY = 65;
const PAGE_BATCH_SIZE = 2;
const MAX_RENDER_PAGES = 15;
const CHUNK_CHARS = 12000;
const MAX_CHUNKS = 20;
const MAX_IMAGES_PER_PRODUCT = 5;
const STORAGE_BUCKET = "media";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un extracteur de catalogues produits. À partir d'un extrait texte de PDF/tableur, retourne UNIQUEMENT un JSON valide de la forme:
{"products":[{...}]}

Champs par produit:
- name (string, requis)
- subtitle (string, optionnel)
- price (number en EUR, requis)
- salePrice (number|null)
- category (string) — ex: "Homme", "Femme", "Accessoires"
- sizes (string[]) — ex: ["S","M","L","XL"]
- colors (string[])
- description (string)
- material (string)
- sku (string, requis — invente au format PREFIX-XXXX si absent)
- stock (number, défaut 50)
- _pageIndex (number|number[]) — numéro(s) de page (1-indexé, tels que fournis dans le prompt) où ce produit apparaît. OBLIGATOIRE quand les pages sont fournies en images.

Aucun texte hors du JSON. Pas de markdown. Si aucun produit détecté: {"products":[]}.`;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Canvas backend for unpdf.
 * The edge runtime (Deno / Linux ARM64) cannot resolve the native bindings of
 * `@napi-rs/canvas`, so we use the pure WASM Skia canvas instead. The module is
 * loaded once and memoized; if it cannot be loaded we disable rasterization
 * entirely instead of retrying (and logging) for every single page.
 */
// deno-lint-disable no-explicit-any
let canvasModule: any | null = null;
let rasterDisabled = false;

async function loadCanvasModule(): Promise<any | null> {
  if (canvasModule || rasterDisabled) return canvasModule;
  try {
    const mod: any = await import("https://deno.land/x/canvas@v1.4.2/mod.ts");
    canvasModule = {
      createCanvas: (width: number, height: number) => {
        const canvas: any = mod.createCanvas(width, height);
        if (typeof canvas.toBuffer !== "function") {
          canvas.toBuffer = () => canvas.encode("png");
        }
        return canvas;
      },
      loadImage: mod.loadImage,
      DOMMatrix: (globalThis as any).DOMMatrix,
    };
  } catch (e) {
    rasterDisabled = true;
    console.warn("PDF rasterization unavailable (canvas WASM load failed):", (e as Error).message);
  }
  return canvasModule;
}

async function renderCompressedPage(
  pdfBytes: Uint8Array,
  pageNumber: number,
): Promise<{ base64: string; mime: string; bytes: Uint8Array } | null> {
  if (rasterDisabled) return null;
  const canvasBackend = await loadCanvasModule();
  if (!canvasBackend) return null;
  try {
    const pngBuf = await renderPageAsImage(pdfBytes, pageNumber, {
      scale: PAGE_RENDER_SCALE,
      // deno-lint-ignore no-explicit-any
      canvas: (async () => canvasBackend) as any,
    });
    const img = await Image.decode(new Uint8Array(pngBuf));
    const longest = Math.max(img.width, img.height);
    if (longest > PAGE_MAX_DIM) {
      const ratio = PAGE_MAX_DIM / longest;
      img.resize(Math.round(img.width * ratio), Math.round(img.height * ratio));
    }
    const jpeg = await img.encodeJPEG(PAGE_JPEG_QUALITY);
    const bytes = new Uint8Array(jpeg);
    return { base64: bytesToBase64(bytes), mime: "image/jpeg", bytes };
  } catch (e) {
    // First failure disables the whole path: the cause is environmental,
    // retrying page after page only floods the logs.
    rasterDisabled = true;
    console.warn(`renderCompressedPage failed page ${pageNumber} (rasterization disabled):`, (e as Error).message);
    return null;
  }
}


function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  const clean = text.replace(/\s+\n/g, "\n").trim();
  for (let i = 0; i < clean.length; i += size) {
    chunks.push(clean.slice(i, i + size));
    if (chunks.length >= MAX_CHUNKS) break;
  }
  return chunks;
}

function extractJson(text: string): any {
  if (!text) return null;
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const obj = cleaned.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch {} }
  const arr = cleaned.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch {} }
  return null;
}

async function callLovableAI(messages: any[], apiKey: string): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: await getAiModel("vision"),
      messages,
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    if (resp.status === 429) return { ok: false, status: 429, message: "IA saturée — réessayez dans quelques instants." };
    if (resp.status === 402) return { ok: false, status: 402, message: "Crédits IA Lovable épuisés." };
    console.error("Lovable AI error", resp.status, detail);
    return { ok: false, status: resp.status, message: "Erreur IA (" + resp.status + ")" };
  }
  const data = await resp.json();
  return { ok: true, text: data?.choices?.[0]?.message?.content ?? "" };
}

function normalizePageIndex(v: unknown): number[] {
  if (typeof v === "number" && Number.isFinite(v)) return [Math.round(v)];
  if (Array.isArray(v)) return v.map(n => typeof n === "number" ? Math.round(n) : Number(n)).filter(n => Number.isFinite(n));
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return [Math.round(n)];
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;
    const { data: roleCheck } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for storage uploads (admin already validated above).
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const storageClient = serviceKey
      ? createClient(Deno.env.get("SUPABASE_URL")!, serviceKey)
      : null;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const fileBase64: string = body.fileBase64 || body.pdfBase64;
    const fileType: string = (body.fileType || "pdf").toLowerCase();

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No file data provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (fileBase64.length > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "Lot PDF trop volumineux (>13 Mo). L'import doit le découper en lots plus légers." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const dayFolder = new Date().toISOString().slice(0, 10);

    async function uploadPageJpeg(pageNumber: number, bytes: Uint8Array): Promise<string | null> {
      if (!storageClient) return null;
      const path = `pdf-import/${dayFolder}/${batchId}/page-${pageNumber}.jpg`;
      try {
        const { error } = await storageClient.storage.from(STORAGE_BUCKET).upload(path, bytes, {
          contentType: "image/jpeg",
          upsert: true,
        });
        if (error) {
          console.warn("storage upload failed:", error.message);
          return null;
        }
        const { data } = storageClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        return data?.publicUrl ?? null;
      } catch (e) {
        console.warn("storage upload threw:", (e as Error).message);
        return null;
      }
    }

    type EmbeddedRef = { url: string; kind: EmbeddedKind };

    async function uploadBytes(path: string, bytes: Uint8Array): Promise<string | null> {
      if (!storageClient) return null;
      try {
        const { error } = await storageClient.storage.from(STORAGE_BUCKET).upload(path, bytes, {
          contentType: "image/jpeg",
          upsert: true,
        });
        if (error) {
          console.warn("storage upload failed:", error.message);
          return null;
        }
        const { data } = storageClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        return data?.publicUrl ?? null;
      } catch (e) {
        console.warn("storage upload threw:", (e as Error).message);
        return null;
      }
    }

    /** Extrait les images embarquées du PDF et les envoie au stockage. */
    async function collectEmbedded(
      pdfBytes: Uint8Array | null,
      maxPage: number,
    ): Promise<Record<number, EmbeddedRef[]>> {
      const out: Record<number, EmbeddedRef[]> = {};
      if (!pdfBytes || maxPage <= 0 || !storageClient) return out;
      let map: Map<number, EmbeddedImage[]>;
      try {
        map = await extractEmbeddedImages(pdfBytes, maxPage);
      } catch (e) {
        console.warn("collectEmbedded failed:", (e as Error).message);
        return out;
      }
      for (const [pageNumber, images] of map) {
        const refs: EmbeddedRef[] = [];
        for (const im of images) {
          const path = `pdf-import/${dayFolder}/${batchId}/p${pageNumber}-${im.index}-${im.kind}.jpg`;
          const url = await uploadBytes(path, im.bytes);
          if (url) refs.push({ url, kind: im.kind });
        }
        if (refs.length > 0) out[pageNumber] = refs;
      }
      return out;
    }

    /** Résout les visuels d'un produit à partir de ses pages. */
    function resolveProductImages(
      pages: number[],
      pageUrls: Record<number, string>,
      embedded: Record<number, EmbeddedRef[]>,
    ) {
      const worn: string[] = [];
      const ghosts: string[] = [];
      const pageShots: string[] = [];
      for (const n of pages) {
        for (const ref of embedded[n] ?? []) {
          const bucket = ref.kind === "ghost" ? ghosts : worn;
          if (!bucket.includes(ref.url)) bucket.push(ref.url);
        }
        const shot = pageUrls[n];
        if (shot && !pageShots.includes(shot)) pageShots.push(shot);
      }
      const mainImage = worn[0] ?? ghosts[0] ?? pageShots[0] ?? null;
      const mainSource: "worn" | "ghost" | "page" | null = worn[0]
        ? "worn"
        : ghosts[0]
          ? "ghost"
          : pageShots[0]
            ? "page"
            : null;
      const gallery: string[] = [];
      for (const u of [...ghosts, ...worn.slice(1), ...pageShots]) {
        if (u && u !== mainImage && !gallery.includes(u)) gallery.push(u);
        if (gallery.length >= MAX_IMAGES_PER_PRODUCT) break;
      }
      const all: string[] = [];
      for (const u of [mainImage, ...gallery]) {
        if (u && !all.includes(u)) all.push(u);
      }
      return {
        mainImage,
        mainSource,
        ghostImages: ghosts.slice(0, MAX_IMAGES_PER_PRODUCT),
        wornImages: worn.slice(0, MAX_IMAGES_PER_PRODUCT),
        pageImages: all.slice(0, MAX_IMAGES_PER_PRODUCT + 1),
      };
    }



    // 1. Extract text locally
    let rawText = "";
    if (fileType === "pdf") {
      try {
        const bytes = base64ToBytes(fileBase64);
        const { text } = await extractText(bytes, { mergePages: true });
        rawText = Array.isArray(text) ? text.join("\n") : (text ?? "");
      } catch (e) {
        console.error("PDF text extraction failed", e);
      }
    } else {
      try {
        rawText = new TextDecoder("utf-8").decode(base64ToBytes(fileBase64));
      } catch {
        rawText = "";
      }
    }

    rawText = rawText.trim();

    // 2. Scanned/image-heavy PDF path: rasterize + AI vision + storage upload
    if (rawText.length < 200 && fileType === "pdf") {
      console.log("Scanned PDF detected — rasterization + recompression path");
      const pdfBytes = base64ToBytes(fileBase64);
      let pageCount = 0;
      try {
        const doc = await getDocumentProxy(pdfBytes);
        // deno-lint-ignore no-explicit-any
        pageCount = (doc as any).numPages ?? 0;
      } catch (e) {
        console.warn("getDocumentProxy failed:", (e as Error).message);
      }

      const pagesToRender = Math.min(pageCount, MAX_RENDER_PAGES);
      let rasterAvailable = pagesToRender > 0;
      const seen = new Map<string, any>();
      const errors: string[] = [];
      let processedPages = 0;
      // Map global page number -> public URL
      const pageUrls: Record<number, string> = {};
      // Images réellement embarquées (ghost / porté) par page
      const embedded = await collectEmbedded(pdfBytes, pagesToRender);

      for (let start = 1; start <= pagesToRender && rasterAvailable; start += PAGE_BATCH_SIZE) {
        const batch: { page: number; base64: string; mime: string; bytes: Uint8Array }[] = [];
        for (let p = start; p < start + PAGE_BATCH_SIZE && p <= pagesToRender; p++) {
          const img = await renderCompressedPage(pdfBytes, p);
          if (!img) { rasterAvailable = false; break; }
          batch.push({ page: p, ...img });
        }
        if (!rasterAvailable || batch.length === 0) break;
        processedPages += batch.length;

        // Upload page JPEGs in parallel to storage
        await Promise.all(batch.map(async (im) => {
          const url = await uploadPageJpeg(im.page, im.bytes);
          if (url) pageUrls[im.page] = url;
        }));

        const content: any[] = [
          { type: "text", text: `Extrait tous les produits de ces pages. Numéros de page fournis: ${batch.map(b => b.page).join(", ")}. Pour chaque produit, renseigne "_pageIndex" avec le(s) numéro(s) exact(s) de page où il figure. Retourne {"products":[...]}.` },
          ...batch.map((im) => ({
            type: "image_url",
            image_url: { url: `data:${im.mime};base64,${im.base64}` },
          })),
        ];
        const aiRes = await callLovableAI([
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ], apiKey);
        // Free base64 memory but keep page numbers for URL mapping below
        for (const im of batch) { (im as any).base64 = ""; (im as any).bytes = null; }

        if (!aiRes.ok) {
          errors.push(`Batch ${Math.ceil(start / PAGE_BATCH_SIZE)}: ${aiRes.message}`);
          if (aiRes.status === 402 || aiRes.status === 429) break;
          continue;
        }
        const parsed = extractJson(aiRes.text) || {};
        const list = Array.isArray(parsed) ? parsed : (parsed.products || []);
        for (const p of list) {
          if (!p || typeof p !== "object") continue;
          const skuKey = String(p.sku || `${p.name}-${p.price}`).trim().toUpperCase();
          if (!skuKey) continue;
          const pages = normalizePageIndex((p as any)._pageIndex);
          // Default: attribute to all pages of the batch if model omitted _pageIndex
          const effectivePages = pages.length > 0 ? pages : batch.map(b => b.page);
          const existing = seen.get(skuKey);
          if (existing) {
            const merged = new Set<number>([...(existing._pages || []), ...effectivePages]);
            existing._pages = Array.from(merged);
          } else {
            const clean = { ...p };
            delete (clean as any)._pageIndex;
            (clean as any)._pages = effectivePages;
            seen.set(skuKey, clean);
          }
        }
      }

      // Resolve images (embedded ghost/worn first, page shots as fallback)
      const allProducts = Array.from(seen.values()).map((p) => {
        const pages: number[] = Array.isArray((p as any)._pages) ? (p as any)._pages : [];
        const out = { ...p, ...resolveProductImages(pages, pageUrls, embedded) };
        delete (out as any)._pages;
        return out;
      });


      if (rasterAvailable && processedPages > 0) {
        return new Response(JSON.stringify({
          products: allProducts,
          mode: "raster-compressed",
          rasterAvailable: true,
          pagesProcessed: processedPages,
          pagesUploaded: Object.keys(pageUrls).length,
          embeddedImages: Object.values(embedded).reduce((n, l) => n + l.length, 0),
          errors: errors.length ? errors : undefined,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }


      // Fallback: raw-PDF multimodal (no images extracted)
      if (fileBase64.length > MAX_MULTIMODAL_SIZE) {
        return new Response(JSON.stringify({
          error: "PDF scanné trop volumineux et rasterisation indisponible. Exportez un PDF texte ou réduisez-le.",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.log("Falling back to raw multimodal PDF call");
      const aiRes = await callLovableAI([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: [
          { type: "text", text: "Extrait tous les produits de ce catalogue PDF. Retourne l'objet JSON {\"products\":[...]}." },
          { type: "file", file: { filename: "catalog.pdf", file_data: `data:application/pdf;base64,${fileBase64}` } },
        ] },
      ], apiKey);
      if (!aiRes.ok) {
        return new Response(JSON.stringify({ error: aiRes.message }), {
          status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const parsed = extractJson(aiRes.text) || {};
      // Rasterization unavailable: fall back on the images embedded in the PDF
      // (ghost / worn) so products still come back with visuals.
      const products = (Array.isArray(parsed) ? parsed : (parsed.products || [])).map((p: any) => {
        const pages = normalizePageIndex(p?._pageIndex);
        const clean = { ...p };
        delete clean._pageIndex;
        return { ...clean, ...resolveProductImages(pages, {}, embedded) };
      });
      return new Response(JSON.stringify({
        products,
        mode: "multimodal",
        rasterAvailable: false,
        embeddedImages: Object.values(embedded).reduce((n, l) => n + l.length, 0),
        errors: errors.length ? errors : undefined,
        chunksProcessed: 1,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    }

    // 3. Text-only mode: also rasterize pages in the background to attach images
    const pdfBytesForImages = fileType === "pdf" ? base64ToBytes(fileBase64) : null;
    let backgroundPageCount = 0;
    if (pdfBytesForImages) {
      try {
        const doc = await getDocumentProxy(pdfBytesForImages);
        // deno-lint-ignore no-explicit-any
        backgroundPageCount = Math.min(((doc as any).numPages ?? 0), MAX_RENDER_PAGES);
      } catch (e) {
        console.warn("bg getDocumentProxy failed:", (e as Error).message);
      }
    }
    const pageUrls: Record<number, string> = {};
    // Images embarquées (ghost / porté) : c'est la source d'images prioritaire
    const embedded = await collectEmbedded(pdfBytesForImages, backgroundPageCount);
    // Render + upload pages sequentially to bound memory (fire-and-await before AI to keep flow simple)
    for (let p = 1; p <= backgroundPageCount; p++) {
      const img = await renderCompressedPage(pdfBytesForImages!, p);
      if (!img) break;
      const url = await uploadPageJpeg(p, img.bytes);
      if (url) pageUrls[p] = url;
    }



    const chunks = chunkText(rawText, CHUNK_CHARS);
    if (chunks.length === 0) {
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seen = new Map<string, any>();
    const errors: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const aiRes = await callLovableAI([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Extrait tous les produits de cet extrait (partie ${i + 1}/${chunks.length}). Retourne {"products":[...]}. Si tu identifies un numéro de page dans le texte pour un produit, remplis "_pageIndex".\n\n--- EXTRAIT ---\n${chunks[i]}` },
      ], apiKey);
      if (!aiRes.ok) {
        errors.push(`Chunk ${i + 1}: ${aiRes.message}`);
        if (aiRes.status === 402 || aiRes.status === 429) {
          if (seen.size === 0) {
            return new Response(JSON.stringify({ error: aiRes.message }), {
              status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          break;
        }
        continue;
      }
      const parsed = extractJson(aiRes.text) || {};
      const list = Array.isArray(parsed) ? parsed : (parsed.products || []);
      for (const p of list) {
        if (!p || typeof p !== "object") continue;
        const skuKey = String(p.sku || `${p.name}-${p.price}`).trim().toUpperCase();
        if (!skuKey) continue;
        const pages = normalizePageIndex((p as any)._pageIndex);
        const existing = seen.get(skuKey);
        if (existing) {
          const merged = new Set<number>([...(existing._pages || []), ...pages]);
          existing._pages = Array.from(merged);
        } else {
          const clean = { ...p };
          delete (clean as any)._pageIndex;
          (clean as any)._pages = pages;
          seen.set(skuKey, clean);
        }
      }
    }

    // Attach images from _pages: visuels embarqués (porté/ghost) en priorité,
    // captures de page en dernier recours. Sans _pageIndex, on ne sait pas
    // rattacher — sauf si le lot ne contient qu'une seule page.
    const productsWithImages = Array.from(seen.values()).map((p) => {
      let pages: number[] = Array.isArray((p as any)._pages) ? (p as any)._pages : [];
      if (pages.length === 0 && backgroundPageCount === 1) pages = [1];
      const out = { ...p, ...resolveProductImages(pages, pageUrls, embedded) };
      delete (out as any)._pages;
      return out;
    });

    return new Response(JSON.stringify({
      products: productsWithImages,
      mode: "text",
      chunksProcessed: chunks.length,
      textLength: rawText.length,
      pagesUploaded: Object.keys(pageUrls).length,
      embeddedImages: Object.values(embedded).reduce((n, l) => n + l.length, 0),
      errors: errors.length ? errors : undefined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("parse-products-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
