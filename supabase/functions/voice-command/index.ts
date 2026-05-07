import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { transcript, products = [] } = await req.json();
    if (!transcript || typeof transcript !== "string" || transcript.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid transcript" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const productList = products.slice(0, 50).map((p: any) =>
      `- ${p.id} | ${p.name} | ${p.category} | ${p.price}€ | sizes:${(p.sizes || []).join(',')}`
    ).join('\n');

    const systemPrompt = `Tu es un assistant vocal e-commerce francophone. À partir de la requête utilisateur et du catalogue, retourne UNE action via tool calling.
Catalogue:
${productList}`;

    const tools = [{
      type: "function",
      function: {
        name: "execute_action",
        description: "Action à exécuter sur le site",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["add_to_cart", "navigate", "search", "clarify"] },
                productId: { type: "string" },
                productQuery: { type: "string" },
                size: { type: "string" },
                color: { type: "string" },
                quantity: { type: "number" },
                destination: { type: "string", enum: ["cart", "checkout", "shop", "product"] },
                query: { type: "string" },
              },
              required: ["type"],
            },
            message: { type: "string", description: "Réponse vocale courte en français" },
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
