// Generate hero slide text (title/subtitle/description/CTA) using Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIELD_GUIDES: Record<string, string> = {
  title: "Un titre court, percutant, en MAJUSCULES, max 5 mots. Style mode/luxe minimaliste.",
  subtitle: "Un sous-titre court (5–10 mots), en MAJUSCULES, qui complète le titre.",
  description: "Une description marketing de 1–2 phrases (max 180 caractères).",
  cta: "Un libellé de bouton très court (1–3 mots) en MAJUSCULES, ex: DÉCOUVRIR, EXPLORER, ACHETER.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { field, context, tone } = await req.json();
    if (!field || !FIELD_GUIDES[field]) {
      return new Response(JSON.stringify({ error: "field invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys = `Tu es un copywriter pour une marque de mode/streetwear "Industrial Luxury" (LVTK6).
Style: minimaliste, mode, premium, français.
${FIELD_GUIDES[field]}
${tone ? `Ton: ${tone}.` : ""}
Réponds uniquement via l'outil "return_text".`;

    const user = `Contexte/brief: ${context || "Slide hero du site e-commerce mode."}\nGénère le ${field}.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "return_text",
            description: "Retourne le texte généré",
            parameters: {
              type: "object",
              properties: { value: { type: "string" } },
              required: ["value"], additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_text" } },
      }),
    });

    if (!resp.ok) {
      const status = resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500;
      const msg = status === 429 ? "Trop de requêtes, réessayez."
        : status === 402 ? "Crédits IA épuisés."
        : "Erreur du service IA.";
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const value = args ? JSON.parse(args).value : data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ value }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-slide-text error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
