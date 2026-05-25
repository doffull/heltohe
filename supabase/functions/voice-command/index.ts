import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { callGemini } from "../_shared/gemini.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Fallback parser (used when AI gateway is unavailable: 402/429/5xx) ───
function fallbackParse(transcript: string, products: any[]): any {
  const t = (transcript || "").toLowerCase();

  if (/\b(panier|mon panier|qu['e]?st.*panier|liste)\b/.test(t)) {
    return { action: { type: "read_cart" }, message: "Voici votre panier." };
  }
  if (/\b(je\s+confirme|valide(?:z)?\s+ma\s+commande|passer.*commande|finaliser)\b/.test(t)) {
    return { action: { type: "place_order" }, message: "Direction le paiement." };
  }
  if (/\b(domicile|chez\s+moi)\b/.test(t)) {
    return { action: { type: "set_delivery", deliveryMode: "home" }, message: "Livraison à domicile sélectionnée." };
  }
  if (/\b(point\s+relais|relais|mondial\s+relay)\b/.test(t)) {
    return { action: { type: "set_delivery", deliveryMode: "relay" }, message: "Livraison en point relais sélectionnée." };
  }
  if (/\b(cherche|trouve|montre|j['e]?\s*aimerais)\b/.test(t)) {
    return { action: { type: "search_products", query: transcript }, message: "Je cherche dans le catalogue." };
  }
  if (/\b(propose|conseille|sugg[eè]re|recommande)\b/.test(t)) {
    return { action: { type: "recommend", query: transcript }, message: "Voici quelques recommandations." };
  }
  if (/\b(ajoute|prends|mets)\b/.test(t)) {
    // Try to find a product by name in transcript
    const match = (products || []).find((p: any) =>
      p?.name && t.includes(String(p.name).toLowerCase())
    );
    if (match) {
      const sizeMatch = t.match(/\b(taille\s+)?(xs|s|m|l|xl|xxl|xxxl|3[6-9]|4[0-9]|5[0-2])\b/i);
      return {
        action: { type: "add_to_cart", productId: match.id, quantity: 1, size: sizeMatch?.[2]?.toUpperCase() },
        message: `${match.name} ajouté au panier.`,
        requiresConfirmation: true,
      };
    }
    return { action: { type: "search_products", query: transcript }, message: "Je n'ai pas trouvé ce produit, je lance une recherche." };
  }
  return { action: { type: "clarify" }, message: "Service vocal en mode dégradé. Dites par exemple : « cherche un t-shirt noir », « livraison à domicile », « lis mon panier », « je confirme »." };
}

function clientErrorResponse(status: number, code: string, userMessage: string) {
  return new Response(JSON.stringify({ error: code, userMessage, status }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { transcript, products = [], context = {}, mode } = body || {};

    // ─── Validate ───
    if (typeof transcript !== "string" || transcript.length === 0 || transcript.length > 1000) {
      return clientErrorResponse(400, "INVALID_TRANSCRIPT", "Phrase vocale invalide ou trop longue.");
    }
    if (mode && !["search", "recommend"].includes(mode)) {
      return clientErrorResponse(400, "INVALID_MODE", "Mode non supporté.");
    }
    if (!Array.isArray(products) || products.length > 200) {
      return clientErrorResponse(400, "INVALID_PRODUCTS", "Liste produits invalide.");
    }

    // Gemini API key checked inside callGemini()
      // No key configured: degrade gracefully
      const parsed = fallbackParse(transcript, products);
      return new Response(JSON.stringify({ ...parsed, degraded: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Mode "search"/"recommend": product retrieval ───
    if (mode === "search" || mode === "recommend") {
      const q = transcript.trim().slice(0, 500);
      const catalog = products.slice(0, 120).map((p: any, i: number) => ({
        idx: i,
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        sizes: p.sizes,
        colors: p.colors,
        description: (p.description || "").slice(0, 120),
      }));

      const searchPrompt = `Tu es l'assistant shopping vocal de LVTK6. À partir de la requête utilisateur en français, sélectionne 1 à 6 produits du catalogue qui correspondent le mieux.
${mode === "recommend" ? "Mode RECOMMANDATION : propose 3 produits avec une raison parlée naturelle." : "Mode RECHERCHE : retourne les meilleurs résultats."}
Catalogue JSON:\n${JSON.stringify(catalog)}\n
Réponds via la fonction search_results.`;

      let searchResp: Response;
      try {
        searchResp = await callGemini({
            model: "google/gemini-3.5-flash",
            messages: [
              { role: "system", content: searchPrompt },
              { role: "user", content: q },
            ],
            tools: [{
              type: "function",
              function: {
                name: "search_results",
                description: "Renvoie les produits correspondants",
                parameters: {
                  type: "object",
                  properties: {
                    productIds: { type: "array", items: { type: "string" } },
                    spoken: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["productIds", "spoken"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "search_results" } },
          });
      } catch (netErr) {
        console.error("voice-command search network error", netErr);
        return new Response(JSON.stringify({ productIds: [], spoken: "Service vocal indisponible.", degraded: "network" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!searchResp.ok) {
        const status = searchResp.status;
        let userMessage = "Recherche vocale indisponible.";
        if (status === 429) userMessage = "Trop de requêtes vocales, réessayez dans un instant.";
        else if (status === 402) userMessage = "Crédits IA épuisés. Le service vocal sera réactivé prochainement.";
        return new Response(JSON.stringify({ productIds: [], spoken: userMessage, error: status === 429 ? "RATE_LIMITED" : status === 402 ? "PAYMENT_REQUIRED" : "AI_ERROR", status }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sd = await searchResp.json();
      const sc = sd?.choices?.[0]?.message?.tool_calls?.[0];
      let result: any = { productIds: [], spoken: "Aucun résultat" };
      if (sc?.function?.arguments) {
        try { result = JSON.parse(sc.function.arguments); } catch {}
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Default: action parser ───
    const productList = products.slice(0, 80).map((p: any) =>
      `- ${p.id} | ${p.name} | ${p.category} | ${p.price}€ | sizes:${(p.sizes || []).join(",")}`
    ).join("\n");

    const cartSummary = (context.cart || []).map((i: any) =>
      `${i.quantity}× ${i.name}${i.size ? " T:" + i.size : ""}${i.color ? " C:" + i.color : ""} @${i.price}€`
    ).join(" | ") || "vide";

    const addr = context.address || {};
    const addrSummary = [addr.name, addr.address, addr.zip, addr.city, addr.phone].filter(Boolean).join(", ") || "non renseignée";

    const systemPrompt = `Tu es un assistant vocal e-commerce francophone pour LVTK6.
Reconnais l'intention dans la phrase et retourne UNE action via tool calling.
Reste concis (max 25 mots).

Contexte:
- Panier: ${cartSummary}
- Adresse: ${addrSummary}
- Mode livraison: ${context.deliveryMode || "non choisi"}

Catalogue:
${productList}

Règles: search_products pour rechercher, recommend pour conseiller, select_result pour "le 2", add_to_cart si produit identifié sans ambiguïté, set_address, set_delivery (home/relay), apply_promo, read_cart, place_order uniquement si "je confirme", clarify sinon.`;

    const tools = [{
      type: "function",
      function: {
        name: "execute_action",
        description: "Action à exécuter",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["add_to_cart", "remove_from_cart", "navigate", "search", "search_products", "recommend", "select_result", "set_address", "set_delivery", "apply_promo", "read_cart", "place_order", "clarify"] },
                productId: { type: "string" },
                productQuery: { type: "string" },
                size: { type: "string" },
                color: { type: "string" },
                quantity: { type: "number" },
                destination: { type: "string", enum: ["cart", "checkout", "shop", "product", "home"] },
                query: { type: "string" },
                address: {
                  type: "object",
                  properties: {
                    name: { type: "string" }, address: { type: "string" }, zip: { type: "string" }, city: { type: "string" }, phone: { type: "string" }, email: { type: "string" },
                  },
                },
                deliveryMode: { type: "string", enum: ["home", "relay"] },
                promoCode: { type: "string" },
                resultIndex: { type: "number" },
              },
              required: ["type"],
            },
            message: { type: "string" },
            requiresConfirmation: { type: "boolean" },
          },
          required: ["action", "message"],
        },
      },
    }];

    let resp: Response;
    try {
      resp = await callGemini({
          model: "google/gemini-3.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: transcript },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "execute_action" } },
        });
    } catch (netErr) {
      console.error("voice-command network error", netErr);
      const parsed = fallbackParse(transcript, products);
      return new Response(JSON.stringify({ ...parsed, degraded: "network" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resp.ok) {
      const status = resp.status;
      const t = await resp.text().catch(() => "");
      console.error("voice-command AI error", status, t.slice(0, 300));

      // Graceful fallback for credit/rate issues so users keep working
      if (status === 402 || status === 429 || status >= 500) {
        const parsed = fallbackParse(transcript, products);
        const userMessage = status === 402
          ? "Crédits IA épuisés — mode vocal dégradé activé."
          : status === 429
            ? "Trop de requêtes — mode vocal dégradé activé."
            : "Service vocal momentanément indisponible — mode dégradé activé.";
        return new Response(JSON.stringify({
          ...parsed,
          degraded: status === 402 ? "payment_required" : status === 429 ? "rate_limited" : "ai_error",
          userMessage,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return clientErrorResponse(status, "AI_ERROR", "Erreur de traitement vocal.");
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = { action: { type: "clarify" }, message: "Je n'ai pas compris" };
    if (call?.function?.arguments) {
      try { parsed = JSON.parse(call.function.arguments); } catch {}
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-command error", e);
    return clientErrorResponse(500, "UNEXPECTED", "Erreur inattendue côté serveur vocal.");
  }
});
