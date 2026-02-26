import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();
    if (!imageBase64) throw new Error("imageBase64 is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
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
