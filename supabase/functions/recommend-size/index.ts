import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

import { callGemini } from "../_shared/gemini.ts";
interface RequestBody {
  category: 'homme' | 'femme' | 'enfant';
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  age?: number;
  morphology?: string;
  fitPreference?: 'ajuste' | 'normal' | 'ample';
  availableSizes?: string[];
  productName?: string;
}

const SIZE_TABLE_HOMME = `Homme: XS(82-86 poitrine, 70-74 taille), S(86-92, 74-80), M(92-98, 80-86), L(98-106, 86-94), XL(106-114, 94-102), XXL(114-122, 102-110), XXXL(122-130, 110-118)`;
const SIZE_TABLE_FEMME = `Femme: XS(78-82 poitrine, 60-64 taille, 86-90 hanches), S(82-86, 64-68, 90-94), M(86-90, 68-72, 94-98), L(90-96, 72-78, 98-104), XL(96-104, 78-86, 104-112), XXL(104-112, 86-94, 112-120)`;
const SIZE_TABLE_ENFANT = `Enfant (par taille en cm): 4A(98-104), 6A(110-116), 8A(122-128), 10A(134-140), 12A(146-152), 14A(158-164), 16A(166-172)`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    const { category, height, weight, chest, waist, hips, age, morphology, fitPreference, availableSizes, productName } = body;

    if (!category || !['homme', 'femme', 'enfant'].includes(category)) {
      return new Response(JSON.stringify({ error: 'Catégorie requise (homme/femme/enfant)' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gemini API key checked inside callGemini()

    const sizeTable = category === 'homme' ? SIZE_TABLE_HOMME : category === 'femme' ? SIZE_TABLE_FEMME : SIZE_TABLE_ENFANT;

    const userInfo = [
      `Catégorie: ${category}`,
      height && `Taille: ${height} cm`,
      weight && `Poids: ${weight} kg`,
      chest && `Tour de poitrine: ${chest} cm`,
      waist && `Tour de taille: ${waist} cm`,
      hips && `Tour de hanches: ${hips} cm`,
      age && `Âge: ${age} ans`,
      morphology && `Morphologie: ${morphology}`,
      fitPreference && `Coupe préférée: ${fitPreference}`,
      productName && `Produit: ${productName}`,
      availableSizes?.length && `Tailles disponibles: ${availableSizes.join(', ')}`,
    ].filter(Boolean).join('\n');

    const systemPrompt = `Tu es un expert en taille de vêtements pour la marque LVTK6. Utilise la grille de tailles EU standard suivante:
${sizeTable}

Recommande LA taille la plus adaptée parmi les tailles disponibles (si fournies). Si une mensuration est entre deux tailles, prends en compte la coupe préférée. Donne une alternative si pertinente. Sois bref et précis en français.`;

    const response = await callGemini({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInfo },
        ],
        tools: [{
          type: "function",
          function: {
            name: "recommend_size",
            description: "Recommande la meilleure taille",
            parameters: {
              type: "object",
              properties: {
                recommendedSize: { type: "string", description: "La taille recommandée (ex: M, L, 10A)" },
                confidence: { type: "number", description: "Score de 0 à 100" },
                alternativeSize: { type: "string", description: "Taille alternative possible" },
                advice: { type: "string", description: "Conseil court en français (1-2 phrases)" },
              },
              required: ["recommendedSize", "confidence", "advice"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "recommend_size" } },
      });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez plus tard." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Pas de recommandation" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend-size error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
