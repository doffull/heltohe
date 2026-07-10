import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 20 MB base64 (~15 MB raw file). Edge functions cap memory ~150 MB and
// unpdf + base64 decode easily double the payload footprint.
const MAX_FILE_SIZE = 20 * 1024 * 1024;
// Multimodal fallback (sends the raw PDF to the AI) is memory-heavy: only
// allow it for small PDFs, otherwise we hit WORKER_RESOURCE_LIMIT.
const MAX_MULTIMODAL_SIZE = 6 * 1024 * 1024;
const CHUNK_CHARS = 12000;
const MAX_CHUNKS = 20;
const AI_MODEL = "google/gemini-2.5-flash";
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

    // 2. If text extraction failed (scanned PDF), fallback to multimodal
    if (rawText.length < 200 && fileType === "pdf") {
      console.log("Falling back to multimodal PDF (scanned document detected)");
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
