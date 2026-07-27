import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy, renderPageAsImage } from "https://esm.sh/unpdf@0.12.1";
// Pure-JS image codec (no native deps) used to downscale & re-encode
// rendered PDF pages as JPEG before shipping them to the AI.
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 60 MB base64 (~45 MB raw file). Rasterization+recompression keeps memory
// bounded even for large catalogs.
const MAX_FILE_SIZE = 60 * 1024 * 1024;
// Raw-PDF multimodal fallback: kept only as a last resort when we cannot
// rasterize+recompress pages ourselves.
const MAX_MULTIMODAL_SIZE = 18 * 1024 * 1024;
// Image-page recompression targets: keep each page well under provider
// limits (~5 MB per image) and small enough to batch several per call.
const PAGE_RENDER_SCALE = 1.5;      // pdf.js viewport scale before downscale
const PAGE_MAX_DIM = 1400;          // px, longest edge after downscale
const PAGE_JPEG_QUALITY = 72;       // 0-100 (ImageScript scale)
const PAGE_BATCH_SIZE = 3;          // pages per AI call
const MAX_RENDER_PAGES = 30;        // hard cap to bound cost/memory
const CHUNK_CHARS = 12000;
const MAX_CHUNKS = 20;
const AI_MODEL = "openai/gpt-5-mini";
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

// Rasterize a single PDF page then downscale + re-encode as JPEG.
// Returns null when the canvas backend is unavailable in this runtime.
async function renderCompressedPage(
  pdfBytes: Uint8Array,
  pageNumber: number,
): Promise<{ base64: string; mime: string } | null> {
  try {
    const pngBuf = await renderPageAsImage(pdfBytes, pageNumber, {
      scale: PAGE_RENDER_SCALE,
      // Lazy import of a Node-compatible canvas. Available on the Supabase
      // edge Deno runtime via npm compat; if it fails we bail cleanly.
      // deno-lint-ignore no-explicit-any
      canvas: (async () => await import("npm:@napi-rs/canvas@0.1.53")) as any,
    });
    const img = await Image.decode(new Uint8Array(pngBuf));
    const longest = Math.max(img.width, img.height);
    if (longest > PAGE_MAX_DIM) {
      const ratio = PAGE_MAX_DIM / longest;
      img.resize(Math.round(img.width * ratio), Math.round(img.height * ratio));
    }
    const jpeg = await img.encodeJPEG(PAGE_JPEG_QUALITY);
    return { base64: bytesToBase64(jpeg), mime: "image/jpeg" };
  } catch (e) {
    console.warn(`renderCompressedPage failed page ${pageNumber}:`, (e as Error).message);
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
      model: AI_MODEL,
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
      return new Response(JSON.stringify({ error: "Fichier trop volumineux (>15 Mo). Divisez-le en plusieurs PDF plus légers." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Extract text locally (no AI cost, no size explosion)
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
      // CSV / Excel: decode as text
      try {
        rawText = new TextDecoder("utf-8").decode(base64ToBytes(fileBase64));
      } catch {
        rawText = "";
      }
    }

    rawText = rawText.trim();

    // 2. If text extraction failed (scanned PDF), rasterize pages, downscale
    //    and re-encode as JPEG before sending. Falls back to the raw-PDF
    //    multimodal call only if the canvas backend is unavailable.
    if (rawText.length < 200 && fileType === "pdf") {
      console.log("Scanned PDF detected — attempting page rasterization + recompression");
      const pdfBytes = base64ToBytes(fileBase64);
      let pageCount = 0;
      try {
        const doc = await getDocumentProxy(pdfBytes);
        // deno-lint-ignore no-explicit-any
        pageCount = (doc as any).numPages ?? 0;
      } catch (e) {
        console.warn("getDocumentProxy failed:", (e as Error).message);
      }

      const compressed: { base64: string; mime: string }[] = [];
      const pagesToRender = Math.min(pageCount, MAX_RENDER_PAGES);
      let rasterAvailable = true;
      for (let p = 1; p <= pagesToRender; p++) {
        const img = await renderCompressedPage(pdfBytes, p);
        if (!img) { rasterAvailable = false; break; }
        compressed.push(img);
      }

      if (rasterAvailable && compressed.length > 0) {
        const seen = new Set<string>();
        const allProducts: any[] = [];
        const errors: string[] = [];
        for (let i = 0; i < compressed.length; i += PAGE_BATCH_SIZE) {
          const batch = compressed.slice(i, i + PAGE_BATCH_SIZE);
          const content: any[] = [
            { type: "text", text: `Extrait tous les produits de ces pages (${i + 1}-${i + batch.length}/${compressed.length}). Retourne {"products":[...]}.` },
            ...batch.map((im) => ({
              type: "image_url",
              image_url: { url: `data:${im.mime};base64,${im.base64}` },
            })),
          ];
          const aiRes = await callLovableAI([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content },
          ], apiKey);
          if (!aiRes.ok) {
            errors.push(`Batch ${i / PAGE_BATCH_SIZE + 1}: ${aiRes.message}`);
            if (aiRes.status === 402 || aiRes.status === 429) break;
            continue;
          }
          const parsed = extractJson(aiRes.text) || {};
          const list = Array.isArray(parsed) ? parsed : (parsed.products || []);
          for (const p of list) {
            if (!p || typeof p !== "object") continue;
            const skuKey = String(p.sku || `${p.name}-${p.price}`).trim().toUpperCase();
            if (!skuKey || seen.has(skuKey)) continue;
            seen.add(skuKey);
            allProducts.push(p);
          }
        }
        return new Response(JSON.stringify({
          products: allProducts,
          mode: "raster-compressed",
          pagesProcessed: compressed.length,
          errors: errors.length ? errors : undefined,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fallback: raw-PDF multimodal (only when small enough)
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
      const products = Array.isArray(parsed) ? parsed : (parsed.products || []);
      return new Response(JSON.stringify({ products, mode: "multimodal", chunksProcessed: 1 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Chunk text and extract per chunk in parallel (bounded)
    const chunks = chunkText(rawText, CHUNK_CHARS);
    if (chunks.length === 0) {
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seen = new Set<string>();
    const allProducts: any[] = [];
    const errors: string[] = [];

    // Sequential to stay well under memory/rate limits for very large PDFs
    for (let i = 0; i < chunks.length; i++) {
      const aiRes = await callLovableAI([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Extrait tous les produits de cet extrait (partie ${i + 1}/${chunks.length}). Retourne {"products":[...]}.\n\n--- EXTRAIT ---\n${chunks[i]}` },
      ], apiKey);
      if (!aiRes.ok) {
        errors.push(`Chunk ${i + 1}: ${aiRes.message}`);
        // Bail out on hard-stop errors (402/429)
        if (aiRes.status === 402 || aiRes.status === 429) {
          if (allProducts.length === 0) {
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
        if (!skuKey || seen.has(skuKey)) continue;
        seen.add(skuKey);
        allProducts.push(p);
      }
    }

    return new Response(JSON.stringify({
      products: allProducts,
      mode: "text",
      chunksProcessed: chunks.length,
      textLength: rawText.length,
      errors: errors.length ? errors : undefined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("parse-products-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
