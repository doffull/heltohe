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
    // Auth check — admin only (this endpoint consumes AI credits)
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
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: claimsData.claims.sub,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { customerName, customerEmail, customerPhone, customerAddress, customerCity, customerZip, customerCountry } = await req.json();

    if (!customerName || !customerEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gemini API key checked inside callGemini()

    const prompt = `Analyse les informations client suivantes et vérifie leur cohérence et validité. Réponds UNIQUEMENT avec un appel à la fonction verify_result.

Informations à vérifier :
- Nom : ${customerName}
- Email : ${customerEmail}
- Téléphone : ${customerPhone || "Non fourni"}
- Adresse : ${customerAddress || "Non fournie"}
- Code postal : ${customerZip || "Non fourni"}
- Ville : ${customerCity || "Non fournie"}
- Pays : ${customerCountry || "Non fourni"}

Vérifie :
1. Le format de l'email (domaine existant, pas de typo évidente)
2. Le format du téléphone (si fourni, doit être un format valide)
3. La cohérence code postal / ville / pays (si le code postal ne correspond pas à la ville ou au pays)
4. Le nom semble-t-il réel (pas de caractères suspects, pas de spam)
5. L'adresse semble-t-elle complète et cohérente`;

    const response = await callGemini({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: "Tu es un expert en vérification d'identité client pour un e-commerce. Tu analyses les informations et détectes les incohérences." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "verify_result",
            description: "Return the verification result",
            parameters: {
              type: "object",
              properties: {
                score: { type: "number", description: "Confidence score 0-100" },
                status: { type: "string", enum: ["valid", "warning", "invalid"], description: "Overall status" },
                issues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string" },
                      severity: { type: "string", enum: ["info", "warning", "error"] },
                      message: { type: "string" },
                    },
                    required: ["field", "severity", "message"],
                  },
                },
                summary: { type: "string", description: "Brief summary in French" },
              },
              required: ["score", "status", "issues", "summary"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "verify_result" } },
      });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI verification failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      result = { score: 50, status: "warning", issues: [{ field: "general", severity: "warning", message: "Vérification IA non concluante" }], summary: "Vérification partielle" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-customer-info error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
