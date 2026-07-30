import { callGemini } from "../_shared/gemini.ts";
// Unified AI helpers for the product form (subtitle, description, material,
// care, attributes, color-name) — uses Lovable AI Gateway.
// Vision actions are grounded on the real product photos (anti-hallucination).
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
  imageUrls?: string[];
  material?: string;
  colors?: string[];
  sizes?: string[];
  hex?: string;
}

const SYS = `Tu es un copywriter mode/streetwear premium pour la marque LVTK6 (Industrial Luxury, minimaliste, français).

RÈGLES DE FIDÉLITÉ (absolues) :
- Tu décris UNIQUEMENT ce qui est visible sur les photos fournies et les données saisies par l'admin.
- INTERDIT d'inventer des performances techniques (imperméabilité, indice thermique, membrane, températures, certifications) si elles ne sont ni visibles ni fournies.
- INTERDIT d'inventer une marque, une collaboration, une origine de fabrication ou une matière non visible.
- Si un détail n'est pas identifiable, ne le mentionne pas (ne devine jamais).
- Français, ton éditorial premium mais factuel.
Réponds toujours via l'outil fourni, jamais en texte libre.`;

const TEXT_TOOL = {
  name: "return_text",
  params: {
    type: "object",
    properties: {
      observations: { type: "array", items: { type: "string" }, description: "Ce qui est réellement visible sur les photos" },
      value: { type: "string" },
    },
    required: ["value"],
  },
};

function ctx(b: Body): string {
  const lines = [
    b.name ? `Nom: "${b.name}"` : null,
    b.category ? `Catégorie: "${b.category}"` : null,
    b.material ? `Matière déclarée: "${b.material}"` : null,
    b.colors?.length ? `Couleurs: ${b.colors.join(", ")}` : null,
    b.sizes?.length ? `Tailles: ${b.sizes.join(", ")}` : null,
  ].filter(Boolean);
  return lines.length ? `\nDonnées saisies par l'admin (fiables) :\n- ${lines.join("\n- ")}` : "";
}

function buildPrompt(b: Body): { user: string; tool: any; multimodal: boolean } {
  switch (b.action) {
    case "subtitle":
      return {
        user: `Génère un sous-titre court (5-10 mots, MAJUSCULES) pour ce produit, fidèle à ce que montrent les photos. Exemple de style: "PROTECTION THERMIQUE EXTRÊME".${ctx(b)}`,
        multimodal: true,
        tool: TEXT_TOOL,
      };
    case "description":
      return {
        user: `Étape 1 — OBSERVE les photos et remplis "observations" avec ce que tu vois RÉELLEMENT et uniquement cela : type de vêtement, couleur(s) dominante(s), aspect de la matière, coupe et longueur, détails (capuche, col, zips, poches, cordons, matelassage, coutures, empiècements, logo/marquage visible).
Étape 2 — RÉDIGE dans "value" une description de 3 à 5 phrases (max 600 caractères, français) construite EXCLUSIVEMENT à partir de ces observations et des données saisies. Aucune caractéristique technique inventée.${ctx(b)}`,
        multimodal: true,
        tool: TEXT_TOOL,
      };
    case "material":
      return {
        user: `Identifie la matière principale APPARENTE sur les photos (ex: "Coton molletonné", "Nylon ripstop matelassé", "Cuir grainé"). Réponse: 2-6 mots. Si la matière n'est pas identifiable avec certitude, réponds exactement "Non identifiable".${ctx(b)}`,
        multimodal: true,
        tool: TEXT_TOOL,
      };
    case "care":
      return {
        user: `Donne les instructions d'entretien standard pour ${b.material ? `un vêtement en ${b.material}` : "ce produit tel qu'il apparaît sur les photos"} en une ligne très courte (ex: "Lavage 30°C, séchage à plat, ne pas repasser"). Reste générique et sûr, sans inventer de traitement spécifique.`,
        multimodal: !b.material,
        tool: TEXT_TOOL,
      };
    case "attributes":
      return {
        user: `Propose 4 à 6 attributs techniques DÉDUCTIBLES des photos ou des données saisies (clé courte + valeur courte, ex: "Coupe"→"Droite", "Col"→"Montant", "Fermeture"→"Zip double curseur", "Poches"→"2 latérales zippées"). N'invente aucun indice de performance (imperméabilité, températures) non visible. Remplis aussi "observations" avec ce que tu vois.${ctx(b)}`,
        multimodal: true,
        tool: {
          name: "return_attributes",
          params: {
            type: "object",
            properties: {
              observations: { type: "array", items: { type: "string" } },
              items: {
                type: "array",
                items: { type: "object", properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key", "value"] },
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
        tool: TEXT_TOOL,
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

    const images = Array.from(
      new Set(
        [...(Array.isArray(body.imageUrls) ? body.imageUrls : []), body.imageUrl]
          .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
      )
    ).slice(0, 4);

    const { user, tool, multimodal } = buildPrompt(body);
    const useVision = multimodal && images.length > 0;

    if (multimodal && images.length === 0 && (body.action === "description" || body.action === "material" || body.action === "attributes")) {
      return new Response(
        JSON.stringify({ error: "Ajoutez au moins une photo pour une génération fidèle au produit." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userContent: any = useVision
      ? [
          { type: "text", text: user + (images.length > 1 ? `\n\n${images.length} photos du même produit sont fournies (vues différentes).` : "") },
          ...images.map((url) => ({ type: "image_url", image_url: { url } })),
        ]
      : user;

    const model = useVision ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

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

    if (typeof parsed.value === "string") {
      parsed.value = parsed.value.trim().replace(/^["«\s]+|["»\s]+$/g, "");
      if (body.action === "description" && parsed.value.length > 900) {
        parsed.value = parsed.value.slice(0, 900).replace(/\s+\S*$/, "") + "…";
      }
    }
    if (Array.isArray(parsed.observations)) {
      parsed.observations = parsed.observations.map((o: unknown) => String(o)).filter(Boolean).slice(0, 12);
    }
    parsed.imagesUsed = images.length;

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("product-ai-helpers error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
