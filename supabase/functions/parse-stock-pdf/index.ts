import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { callGeminiText, extractJson } from "../_shared/ai-extraction.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const userId = claimsData.claims.sub;
    const { data: roleCheck } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!roleCheck) return json({ error: "Forbidden: admin role required" }, 403);

    const body = await req.json();
    const fileBase64: string | undefined = body.fileBase64;
    const fileType: string = (body.fileType || "pdf").toLowerCase();

    if (!fileBase64 || typeof fileBase64 !== "string" || fileBase64.length > MAX_FILE_SIZE) {
      return json({ error: "Invalid or oversized file" }, 400);
    }

    // Gemini API key checked inside callGemini()

    const mime =
      fileType === "pdf" ? "application/pdf" :
      fileType === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :
      fileType === "xls" ? "application/vnd.ms-excel" :
      fileType === "csv" ? "text/csv" :
      "application/octet-stream";

    const dataUrl = `data:${mime};base64,${fileBase64}`;

    const prompt = `Tu reçois un rapport d'inventaire (souvent format ATUM WooCommerce). 
Extrais TOUS les produits sous forme JSON: { "items": [{ "sku": string, "name": string, "stock": number }] }.
- "sku": identifiant produit (UGS, SKU, code).
- "name": nom du produit/variante.
- "stock": quantité actuelle en nombre entier (0 si vide).
Ignore les en-têtes/totaux/lignes vides. Retourne UNIQUEMENT le JSON, sans texte autour.`;

    const aiRes = await callGeminiText({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }, "parse-stock-pdf");

    if (!aiRes.ok) {
      return json({ error: aiRes.message, items: [] }, aiRes.status);
    }

    const parsed = extractJson<{ items?: unknown[] }>(aiRes.text) ?? {};
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    const cleaned = items
      .map((it: any) => ({
        sku: String(it.sku ?? "").trim(),
        name: String(it.name ?? "").trim(),
        stock: Math.max(0, Math.round(Number(it.stock) || 0)),
      }))
      .filter((it: any) => it.sku || it.name);

    return json({ items: cleaned, count: cleaned.length });
  } catch (err: any) {
    console.error("parse-stock-pdf error", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
