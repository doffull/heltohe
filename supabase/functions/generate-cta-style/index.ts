// Generate a CTA style preset (variant + colors + size + position) using Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { context } = await req.json().catch(() => ({}));
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys = `Tu es un directeur artistique pour une marque techwear/luxe minimaliste (LVTK6).
Tu proposes UN preset de design pour deux boutons CTA (principal + secondaire) sur un hero produit.
Choisis des combinaisons audacieuses mais lisibles. Réponds uniquement via l'outil "return_preset".`;

    const user = `Brief: ${context || "slide hero techwear"}. Propose un preset visuel.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "return_preset",
            description: "Retourne un preset de design CTA",
            parameters: {
              type: "object",
              properties: {
                variant: { type: "string", enum: ["glossy", "glass", "neon", "metal", "outline", "minimal"] },
                size: { type: "string", enum: ["sm", "md", "lg", "xl"] },
                radius: { type: "string", enum: ["none", "sm", "md", "pill"] },
                gap: { type: "number" },
                primaryBg: { type: "string" },
                primaryFg: { type: "string" },
                secondaryBg: { type: "string" },
                secondaryFg: { type: "string" },
                positionY: { type: "number", description: "0-100 % vertical position over the image" },
                layout: { type: "string", enum: ["row", "column"] },
              },
              required: ["variant", "size", "radius", "gap", "positionY", "layout"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_preset" } },
      }),
    });

    if (!resp.ok) {
      const status = resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500;
      const msg = status === 429 ? "Trop de requêtes." : status === 402 ? "Crédits IA épuisés." : "Erreur IA.";
      return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const p = args ? JSON.parse(args) : {};
    const preset = {
      enabled: true,
      variant: p.variant || "glossy",
      size: p.size || "lg",
      radius: p.radius || "md",
      gap: typeof p.gap === "number" ? p.gap : 12,
      primaryBg: p.primaryBg, primaryFg: p.primaryFg,
      secondaryBg: p.secondaryBg, secondaryFg: p.secondaryFg,
      position: {
        desktop: { x: 50, y: typeof p.positionY === "number" ? p.positionY : 90, layout: p.layout || "row" },
        mobile:  { x: 50, y: typeof p.positionY === "number" ? Math.min(p.positionY + 2, 96) : 94, layout: "column" },
      },
    };
    return new Response(JSON.stringify({ preset }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-cta-style error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
