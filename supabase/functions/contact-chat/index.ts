import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { callGemini } from "../_shared/gemini.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_SYSTEM_PROMPT = `Tu es Helvetica, l'expert mode et conseiller personnel de LVTK6, une marque de streetwear/concept haut de gamme. Tu réponds en français, de manière concise, stylée et moderne — dans le ton de la marque : direct, premium, contemporain.

Tu maîtrises :
- Les collections LVTK6 : Homme, Femme, Enfant, Accessoires
- Les conseils vestimentaires et associations de tenues
- Les tendances mode et streetwear
- Les matières et compositions (polyester technique, coton, etc.)
- La logistique : livraison gratuite dès 200€ en point relais, retours sous 30 jours
- Les tailles disponibles : XS, S, M, L, XL, XXL, XXXL
- La garantie produit : 1 an

Si tu ne sais pas, propose de contacter le service client par email. Ne promets rien de faux. Tu t'appelles Helvetica et tu représentes la marque LVTK6.`;

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 4000;

// ── In-memory rate limiter ─────────────────────────────────────────────────
// Keyed by IP address. Allows MAX_REQUESTS per WINDOW_MS rolling window.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

interface RateEntry {
  count: number;
  windowStart: number;
}
const rateLimitMap = new Map<string, RateEntry>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  return false;
}

// Periodically purge stale entries to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 2);
// ──────────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Trop de requêtes, veuillez réessayer dans un moment." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];

    // Sanitize: only allow user/assistant roles, cap count and content length
    const safeMessages = rawMessages
      .filter((m: any) => m?.role === "user" || m?.role === "assistant")
      .slice(-MAX_MESSAGES)
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content ?? "").slice(0, MAX_CONTENT_LENGTH),
      }));

    // Gemini API key checked inside callGemini()


    // Fetch bot config from DB (best-effort, fallback to default)
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data } = await supabase
        .from("bot_config")
        .select("system_prompt")
        .eq("is_active", true)
        .single();
      if (data?.system_prompt) {
        systemPrompt = data.system_prompt;
      }
    } catch (e) {
      console.warn("Could not fetch bot_config, using default prompt:", e);
    }

    const response = await callGemini({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...safeMessages,
      ],
      stream: true,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, veuillez réessayer dans un moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Quota dépassé, veuillez contacter l'administrateur." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("contact-chat error:", e);
    return new Response(
      JSON.stringify({ error: "Erreur interne du service" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
