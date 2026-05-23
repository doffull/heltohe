import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

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

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
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
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error", aiRes.status, txt);
      if (aiRes.status === 429) return json({ error: "RATE_LIMIT", message: "Trop de requêtes, réessayez dans un instant.", items: [] }, 200);
      if (aiRes.status === 402) return json({ error: "AI_CREDITS_EXHAUSTED", message: "Crédits IA épuisés. Ajoutez des crédits dans Settings → Workspace → Usage.", items: [] }, 200);
      return json({ error: "AI_FAILED", message: "Extraction IA échouée", items: [] }, 200);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // try to extract JSON block
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
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
