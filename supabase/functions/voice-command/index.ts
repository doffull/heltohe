import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { transcript, products = [], context = {}, mode } = body;

    // ─── Mode "search": recherche/recommandation produits ───
    if (mode === 'search' || mode === 'recommend') {
      const q = (typeof transcript === 'string' ? transcript : '').trim().slice(0, 500);
      if (!q) {
        return new Response(JSON.stringify({ productIds: [], spoken: 'Que cherches-tu ?' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) throw new Error('Missing LOVABLE_API_KEY');

      // Compact catalog for the model
      const catalog = products.slice(0, 120).map((p: any, i: number) => ({
        idx: i,
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        sizes: p.sizes,
        colors: p.colors,
        description: (p.description || '').slice(0, 120),
      }));

      const searchPrompt = `Tu es l'assistant shopping vocal de LVTK6. À partir de la requête utilisateur en français, sélectionne 1 à 6 produits du catalogue qui correspondent le mieux (par nom, couleur, type, mots-clés).
${mode === 'recommend' ? 'Mode RECOMMANDATION : propose 3 produits pertinents avec une raison parlée naturelle.' : 'Mode RECHERCHE : retourne les meilleurs résultats correspondants.'}
Catalogue JSON:\n${JSON.stringify(catalog)}\n
Réponds via la fonction search_results.`;

      const searchResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: searchPrompt },
            { role: 'user', content: transcript },
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'search_results',
              description: 'Renvoie les produits correspondants',
              parameters: {
                type: 'object',
                properties: {
                  productIds: { type: 'array', items: { type: 'string' } },
                  spoken: { type: 'string', description: 'Phrase à dire à voix haute (max 30 mots)' },
                  reason: { type: 'string', description: 'Pourquoi ces produits' },
                },
                required: ['productIds', 'spoken'],
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'search_results' } },
        }),
      });

      if (!searchResp.ok) {
        if (searchResp.status === 429) return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (searchResp.status === 402) return new Response(JSON.stringify({ error: 'Payment required' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ error: 'AI error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const sd = await searchResp.json();
      const sc = sd.choices?.[0]?.message?.tool_calls?.[0];
      let result: any = { productIds: [], spoken: 'Aucun résultat' };
      if (sc?.function?.arguments) { try { result = JSON.parse(sc.function.arguments); } catch {} }
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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
- Si l'utilisateur cherche un produit ("cherche…", "trouve…", "montre-moi…", "j'aimerais…") sans nommer un produit précis -> action search_products avec query=mots-clés.
- Si l'utilisateur demande une recommandation ("propose-moi…", "qu'est-ce que tu me conseilles…", "suggère…") -> action recommend avec query=contexte.
- Si l'utilisateur réfère à un résultat précédent ("le 2", "le deuxième", "le rouge") -> select_result avec resultIndex (1-based) et éventuellement size/color/quantity.
- Pour ajouter au panier directement quand le produit est sans ambiguïté: add_to_cart avec productId.
- Pour adresse: extrais nom complet, adresse, code postal, ville, téléphone (place_order ne marche que si adresse complète).
- Pour livraison: 'home' (domicile) ou 'relay' (point relais).
- Pour valider la commande: l'utilisateur doit dire explicitement "je confirme" / "valide ma commande" -> place_order.
- Pour lire panier/total: read_cart.
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
                  enum: ["add_to_cart", "remove_from_cart", "navigate", "search", "search_products", "recommend", "select_result", "set_address", "set_delivery", "apply_promo", "read_cart", "place_order", "clarify"],
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
                resultIndex: { type: "number", description: "1-based index dans la dernière liste de résultats" },
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
