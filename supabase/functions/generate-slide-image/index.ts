// Generate a hero slide image with Lovable AI (Nano Banana) and upload to Storage
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.length < 3) {
      return new Response(JSON.stringify({ error: "prompt requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("Missing env");
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{
          role: "user",
          content: `High-quality cinematic fashion photography for a hero banner. Style: industrial luxury, minimalist, editorial. ${prompt}`,
        }],
        modalities: ["image", "text"],
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
    const dataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
    if (!dataUrl?.startsWith("data:")) {
      return new Response(JSON.stringify({ error: "Aucune image générée" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode base64
    const [meta, b64] = dataUrl.split(",");
    const contentType = /data:([^;]+);/.exec(meta)?.[1] || "image/png";
    const ext = contentType.split("/")[1] || "png";
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const path = `slides/ai/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, bin, {
      contentType, upsert: false,
    });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);

    return new Response(JSON.stringify({ url: pub.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-slide-image error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
