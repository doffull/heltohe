import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { transcript, products = [], context = {} } = await req.json();
    if (!transcript || typeof transcript !== "string" || transcript.length > 1000) {
      return new Response(JSON.stringify({ error: "Invalid transcript" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const productList = products.slice(0, 80).map((p: any) =>
      `- ${p.id} | ${p.name} | ${p.category} | ${p.price}€ | sizes:${(p.sizes || []).join(',')}`
    ).join('\n');

    const cartSummary = (context.cart || []).map((i: any) =>
      `${i.quantity}× ${i.name}${i.size ? ' T:' + i.size : ''}${i.color ? ' C:' + i.color : ''} @${i.price}€`
    ).join(' | ') || 'vide';

    const addr = context.address || {};
    const addrSummary = [addr.name, addr.address, addr.zip, addr.city, addr.phone].filter(Boolean).join(', ') || 'non renseignée';

    const systemPrompt = `Tu es un assistant vocal e-commerce francophone pour LVTK6 (mode techwear luxe).
Reconnais l'intention dans la phrase utilisateur et retourne UNE action via tool calling.
Reste concis dans le champ "message" (max 25 mots), parle naturellement.

Contexte courant:
- Panier: ${cartSummary}
- Adresse: ${addrSummary}
- Mode livraison: ${context.deliveryMode || 'non choisi'}

Catalogue:
${productList}

Règles:
- Pour ajouter au panier: utilise add_to_cart avec productId si tu identifies le produit, sinon productQuery + précision attendue.
- Pour adresse: extrais nom complet, adresse, code postal, ville, téléphone (place_order ne marche que si adresse complète).
- Pour livraison: 'home' (domicile) ou 'relay' (point relais).
- Pour valider la commande: l'utilisateur doit dire explicitement "je confirme" / "valide ma commande" -> place_order.
- Pour lire panier/total: utilise read_cart.
- Si tu n'es pas sûr: clarify avec une question courte.`;

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
                type: {
                  type: "string",
                  enum: ["add_to_cart", "remove_from_cart", "navigate", "search", "set_address", "set_delivery", "apply_promo", "read_cart", "place_order", "clarify"],
                },
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
                    name: { type: "string" },
                    address: { type: "string" },
                    zip: { type: "string" },
                    city: { type: "string" },
                    phone: { type: "string" },
                    email: { type: "string" },
                  },
                },
                deliveryMode: { type: "string", enum: ["home", "relay"] },
                promoCode: { type: "string" },
              },
              required: ["type"],
            },
            message: { type: "string", description: "Réponse vocale courte FR" },
            requiresConfirmation: { type: "boolean", description: "true pour les actions sensibles (add_to_cart, place_order, set_address)" },
          },
          required: ["action", "message"],
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "execute_action" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = { action: { type: "clarify" }, message: "Je n'ai pas compris" };
    if (call?.function?.arguments) {
      try { parsed = JSON.parse(call.function.arguments); } catch { /* ignore */ }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-command error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
