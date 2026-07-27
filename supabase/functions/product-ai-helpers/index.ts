import { callGemini } from "../_shared/gemini.ts";
// Unified AI helpers for the product form (subtitle, description, material,
// care, attributes, color-name) — uses Lovable AI Gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "subtitle" | "description" | "material" | "care" | "attributes" | "color-name";

interface Body {
  action: Action;
  name?: string;
  category?: string;
  imageUrl?: string;
  material?: string;
  hex?: string;
}

const SYS = `Tu es un copywriter mode/streetwear premium pour la marque LVTK6 (Industrial Luxury, minimaliste, français). Réponds toujours via l'outil fourni, jamais en texte libre.`;

function buildPrompt(b: Body): { user: string; tool: any; multimodal: boolean } {
  switch (b.action) {
    case "subtitle":
      return {
        user: `Génère un sous-titre court (5-10 mots, MAJUSCULES) pour ce produit. Nom: "${b.name || ''}". Catégorie: "${b.category || ''}". Exemple de style: "PROTECTION THERMIQUE EXTRÊME".`,
        multimodal: false,
        tool: { name: "return_text", params: { type: "object", properties: { value: { type: "string" } }, required: ["value"] } },
      };
    case "description":
      return {
        user: `Décris ce produit en 3-5 phrases (style éditorial premium, ton mode, max 600 caractères). Mets en avant matières, coupe, usage. Nom: "${b.name || ''}". Catégorie: "${b.category || ''}".`,
        multimodal: true,
        tool: { name: "return_text", params: { type: "object", properties: { value: { type: "string" } }, required: ["value"] } },
      };
    case "material":
      return {
        user: `Identifie la matière principale visible sur l'image (ex: "Coton bio 100%", "Gore-Tex Pro 3L", "Nylon ripstop"). Réponse: 2-6 mots.`,
        multimodal: true,
        tool: { name: "return_text", params: { type: "object", properties: { value: { type: "string" } }, required: ["value"] } },
      };
    case "care":
      return {
        user: `Donne les instructions d'entretien optimales pour ${b.material ? `un vêtement en ${b.material}` : 'ce produit'} en une ligne très courte (ex: "Lavage 30°C, séchage à plat, ne pas repasser").`,
        multimodal: !b.material,
        tool: { name: "return_text", params: { type: "object", properties: { value: { type: "string" } }, required: ["value"] } },
      };
    case "attributes":
      return {
        user: `Propose 4 à 6 attributs techniques pour ce produit (clé courte + valeur courte, ex: "Imperméabilité"→"Niveau 5", "Coupe"→"Slim"). Nom: "${b.name || ''}".`,
        multimodal: true,
        tool: {
          name: "return_attributes",
          params: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { type: "object", properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key", "value"] },
                minItems: 3, maxItems: 6,
              },
            },
            required: ["items"],
          },
        },
      };
    case "color-name":
      return {
        user: `Donne un nom poétique et mode (2-3 mots, français) pour la couleur de code hex ${b.hex}. Exemples: "Noir Obsidian", "Vert Forêt", "Beige Sable". Réponse: nom seul.`,
        multimodal: false,
        tool: { name: "return_text", params: { type: "object", properties: { value: { type: "string" } }, required: ["value"] } },
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body?.action) {
      return new Response(JSON.stringify({ error: "action requise" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Gemini API key checked inside callGemini()

    const { user, tool, multimodal } = buildPrompt(body);

    const userContent: any = multimodal && body.imageUrl
      ? [{ type: "text", text: user }, { type: "image_url", image_url: { url: body.imageUrl } }]
      : user;

    const model = multimodal && body.imageUrl ? "openai/gpt-5-mini" : "openai/gpt-5-mini";

    const resp = await callGemini({
        model,
        messages: [{ role: "system", content: SYS }, { role: "user", content: userContent }],
        tools: [{ type: "function", function: { name: tool.name, description: "Réponse structurée", parameters: tool.params } }],
        tool_choice: { type: "function", function: { name: tool.name } },
      });

    if (!resp.ok) {
      const msg = resp.status === 429 ? "Trop de requêtes, réessayez."
        : resp.status === 402 ? "Crédits IA épuisés."
        : "Erreur du service IA.";
      return new Response(JSON.stringify({ error: msg, status: resp.status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const argsStr = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = argsStr ? JSON.parse(argsStr) : { value: data.choices?.[0]?.message?.content || "" };

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("product-ai-helpers error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
