import { callGemini } from "../_shared/gemini.ts";
// Generate hero slide text (title/subtitle/description/CTA) using Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIELD_GUIDES: Record<string, string> = {
  title: "Un titre de 2 à 4 mots, en MAJUSCULES, sans ponctuation finale. Concret : nomme le produit, la matière ou la saison réelle (ex: DOUDOUNE ARCTIC, HIVER RIPSTOP). Interdit : mots creux (ULTIME, RÉVOLUTION), anglicismes gratuits, emojis.",
  subtitle: "Un sous-titre de 5 à 9 mots, en MAJUSCULES, qui apporte une information NOUVELLE par rapport au titre (matière, coupe, usage). Pas de répétition du titre, pas de point final.",
  description: "Une description de 1 à 2 phrases, 120 à 180 caractères, français. Une seule idée par phrase, un fait concret (matière, construction, usage). Aucune performance chiffrée inventée, aucun superlatif creux.",
  cta: "Un libellé de bouton de 1 à 2 mots en MAJUSCULES, verbe d'action à l'infinitif (ex: DÉCOUVRIR, EXPLORER, COMMANDER). Jamais de phrase.",
  slide_name: "Un nom interne de 2 à 4 mots, style descriptif back-office, pour repérer la slide (ex: 'Capsule Hiver Noir', 'Hero Doudoune Homme'). Pas de MAJUSCULES intégrales.",
  badge_line1: "Un seul mot en MAJUSCULES, 4 à 8 caractères, vocabulaire industriel (ex: MODEL, EDITION, SERIE, TYPE).",
  badge_line2: "Un code court de 3 à 6 caractères en MAJUSCULES/chiffres (ex: 0.1.2, FW25, A-07). Rien d'autre.",
  cta_primary: "Un libellé d'action principal de 1 à 2 mots en MAJUSCULES, orienté achat (ex: ACQUÉRIR, COMMANDER, ACHETER).",
  cta_secondary: "Un libellé secondaire de 1 à 2 mots en MAJUSCULES, orienté exploration (ex: EXPLORER, DÉTAILS, COLLECTION). Doit différer du CTA principal.",
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

    // Gemini API key checked inside callGemini()

    const sys = `Tu es directeur de la rédaction pour HELVETICA-MP / HELVETICA-MP : mode & outerwear technique, positionnement "Industrial Luxury", français, minimaliste et factuel.
Règles générales : phrases courtes, vocabulaire concret et précis (matière, coupe, construction, usage). Aucune performance technique inventée (imperméabilité, températures, certifications), aucun superlatif creux, aucun emoji, aucun hashtag, aucun guillemet autour de la réponse, aucun préfixe du type "Voici".
Consigne du champ demandé — respecte-la à la lettre : ${FIELD_GUIDES[field]}
${tone ? `Ton: ${tone}.` : ""}
Réponds uniquement via l'outil "return_text", avec le texte final seul.`;

    const user = `Contexte/brief: ${context || "Slide hero du site e-commerce mode."}\nGénère uniquement le champ "${field}" en respectant strictement le format imposé.`;

    const resp = await callGemini({
        model: "google/gemini-3.6-flash",

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
      });

    if (!resp.ok) {
      const msg = resp.status === 429 ? "Trop de requêtes, réessayez."
        : resp.status === 402 ? "Crédits IA épuisés."
        : "Erreur du service IA.";
      // Return 200 with error payload so supabase-js doesn't throw and crash the UI
      return new Response(JSON.stringify({ error: msg, fallback: true, status: resp.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
