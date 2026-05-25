import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { callGemini } from "../_shared/gemini.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check — admin only
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

    const { data: roleCheck } = await supabase.rpc("has_role", {
      _user_id: claimsData.claims.sub,
      _role: "admin",
    });

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64, mimeType = "image/jpeg" } = await req.json();
    if (!imageBase64) throw new Error("imageBase64 is required");

    // Gemini API key checked inside callGemini()

    const systemPrompt = `You are a product catalog AI. Analyze the provided product mockup/lookbook image and extract ALL product information visible.

Extract and return a JSON object with this exact structure:
{
  "name": "PRODUCT NAME (uppercase if stylized)",
  "subtitle": "brand collaboration or collection name if visible",
  "price": estimated price as number (if not visible, estimate based on category/quality, e.g. 180 for a premium jacket),
  "category": "Homme" | "Femme" | "Enfant" | "Accessoires" (detect from visual cues),
  "sizes": ["XS", "S", "M", "L", "XL", "XXL"] (exact sizes listed in image, or standard range if not visible),
  "material": "composition text if visible, e.g. 100% POLYESTER",
  "description": "Generate a compelling 2-3 sentence product description based on what you see",
  "tags": ["tag1", "tag2"] (e.g. "limited edition", "waterproof", "outdoor", etc.),
  "season": "season/year if visible e.g. HIVER 2026",
  "colorOptions": [
    {
      "color": "#hexcode",
      "label": "color name in French"
    }
  ]
}

CRITICAL for colorOptions:
- Look carefully for color swatches, color chips, or color variants shown in the image
- Extract the EXACT hex color codes by carefully reading the visual colors
- Common color names in French: Noir, Blanc, Gris, Marine, Bordeaux, Kaki, Beige, Marron, Rouge, Bleu, Vert
- If no swatches visible, infer from the product's main color in the image
- Always include at least one color

Return ONLY the JSON object, no markdown, no explanation.`;

    const response = await callGemini({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              {
                type: "text",
                text: "Analyze this product mockup image and extract all product information including exact colors with hex codes.",
              },
            ],
          },
        ],
        temperature: 0.1,
      });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite temporaire Gemini atteinte. Veuillez réessayer dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Quota ou plafond de dépense Gemini atteint. Ouvrez Google AI Studio > Billing/Spend cap pour augmenter le plafond, puis relancez l’analyse." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      throw new Error(`AI gateway error: ${response.status} ${errText}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let extracted: Record<string, unknown>;
    try {
      // Remove any potential markdown code blocks
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    // Ensure required fields
    const result = {
      name: extracted.name || "Nouveau Produit",
      subtitle: extracted.subtitle || "",
      price: typeof extracted.price === "number" ? extracted.price : 99,
      category: extracted.category || "Homme",
      sizes: Array.isArray(extracted.sizes) ? extracted.sizes : ["S", "M", "L", "XL"],
      material: extracted.material || "",
      description: extracted.description || "",
      tags: Array.isArray(extracted.tags) ? extracted.tags : [],
      season: extracted.season || "",
      colorOptions: Array.isArray(extracted.colorOptions) ? extracted.colorOptions : [{ color: "#1a1a1a", label: "Noir" }],
      sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
      stock: 50,
    };

    return new Response(JSON.stringify({ success: true, product: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-product-image error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
