// AI Gateway (Gemini via Lovable AI).
// All text + vision calls route to https://ai.gateway.lovable.dev/v1/chat/completions
// using LOVABLE_API_KEY. Default model = google/gemini-2.5-flash (balanced).
// The exported name `callGemini` is kept so existing edge functions keep working.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

type OAIRole = "system" | "user" | "assistant" | "tool";
type OAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type OAIMessage = {
  role: OAIRole;
  content: string | OAIContentPart[];
  tool_call_id?: string;
  name?: string;
};
type OAITool = {
  type: "function";
  function: { name: string; description?: string; parameters: unknown };
};
type OAIBody = {
  model?: string;
  messages: OAIMessage[];
  stream?: boolean;
  tools?: OAITool[];
  tool_choice?: unknown;
  response_format?: { type: "json_object" | "text" };
  temperature?: number;
};

const CORS_PASSTHROUGH = { "Access-Control-Allow-Origin": "*" };

function jsonResponse(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_PASSTHROUGH, ...extra },
  });
}

function pickModel(m?: string): string {
  if (!m) return DEFAULT_MODEL;
  if (m.startsWith("openai/") || m.startsWith("google/")) return m;
  // Legacy model ids from previous integrations → map to Gemini defaults.
  if (/reason|pro/i.test(m)) return "google/gemini-2.5-pro";
  return DEFAULT_MODEL;
}

// ── Clé Gemini directe (optionnelle, configurée depuis l'admin) ────────────
// Si une clé Gemini est enregistrée (table payment_gateway_secrets, ligne
// gateway = 'gemini_api') ou présente dans l'env GEMINI_API_KEY, tous les
// appels de modèles `google/*` passent en direct par l'API Google
// (endpoint compatible OpenAI). Sinon → passerelle Lovable AI.
const GOOGLE_OAI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

let geminiKeyCache: { at: number; key: string | null } | null = null;
const KEY_CACHE_MS = 60_000;

export async function getGeminiApiKey(force = false): Promise<string | null> {
  if (!force && geminiKeyCache && Date.now() - geminiKeyCache.at < KEY_CACHE_MS) {
    return geminiKeyCache.key;
  }
  let key: string | null = null;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && svc) {
      const res = await fetch(
        `${url}/rest/v1/payment_gateway_secrets?gateway=eq.gemini_api&select=secret_key&limit=1`,
        { headers: { apikey: svc, Authorization: `Bearer ${svc}` } },
      );
      if (res.ok) {
        const rows = await res.json();
        const v = rows?.[0]?.secret_key;
        if (typeof v === "string" && v.trim()) key = v.trim();
      }
    }
  } catch (e) {
    console.warn("getGeminiApiKey lookup failed:", e);
  }
  if (!key) {
    const env = Deno.env.get("GEMINI_API_KEY");
    if (env && env.trim()) key = env.trim();
  }
  geminiKeyCache = { at: Date.now(), key };
  return key;
}

export async function callGemini(body: OAIBody): Promise<Response> {
  const model = pickModel(body.model);
  const payload = { ...body, model };

  // 1) Clé Gemini fournie par l'admin → appel direct à Google (modèles google/*)
  if (model.startsWith("google/")) {
    const geminiKey = await getGeminiApiKey();
    if (geminiKey) {
      const direct = await fetch(GOOGLE_OAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${geminiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, model: model.replace(/^google\//, "") }),
      });
      if (direct.ok) {
        const h = new Headers(direct.headers);
        Object.entries(CORS_PASSTHROUGH).forEach(([k, v]) => h.set(k, v));
        return new Response(direct.body, { status: direct.status, headers: h });
      }
      const errText = await direct.text();
      console.error("Gemini direct API error:", direct.status, errText.slice(0, 500));
      if (direct.status === 401 || direct.status === 403) {
        return jsonResponse(direct.status, {
          error: "Clé Gemini refusée par Google. Vérifiez-la dans Admin → Chatbot → Modèles IA.",
        });
      }
      // Autres erreurs (429, 5xx, modèle indisponible) → repli passerelle Lovable.
      console.warn("Falling back to Lovable AI Gateway after Gemini direct failure");
    }
  }

  // 2) Passerelle Lovable AI (par défaut)
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return jsonResponse(500, { error: "LOVABLE_API_KEY is not configured" });

  const upstream = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    console.error("Lovable AI Gateway error:", upstream.status, text.slice(0, 500));
    if (upstream.status === 429) {
      return jsonResponse(429, { error: "Trop de requêtes IA. Réessayez dans quelques instants." });
    }
    if (upstream.status === 402) {
      return jsonResponse(402, { error: "Crédits IA épuisés. Rechargez votre workspace Lovable." });
    }
    return jsonResponse(upstream.status, { error: "AI gateway error", details: text.slice(0, 500) });
  }

  const headers = new Headers(upstream.headers);
  Object.entries(CORS_PASSTHROUGH).forEach(([k, v]) => headers.set(k, v));
  return new Response(upstream.body, { status: upstream.status, headers });
}

// ── Modèles configurables depuis l'admin (table bot_config) ────────────────
// Permet de régler, sans redéployer, le modèle Gemini utilisé par le chatbot,
// la commande vocale, les générateurs de texte et les analyses d'images.
export type AiModelKind = "chat" | "voice" | "default" | "vision";

const MODEL_FALLBACKS: Record<AiModelKind, string> = {
  chat: DEFAULT_MODEL,
  voice: DEFAULT_MODEL,
  default: DEFAULT_MODEL,
  vision: "google/gemini-2.5-pro",
};

const MODEL_COLUMNS: Record<AiModelKind, string> = {
  chat: "chat_model",
  voice: "voice_model",
  default: "ai_default_model",
  vision: "ai_vision_model",
};

let modelCache: { at: number; row: Record<string, string> } | null = null;
const MODEL_CACHE_MS = 60_000;

/** Lit le modèle configuré pour un usage donné (fallback = Gemini par défaut). */
export async function getAiModel(kind: AiModelKind): Promise<string> {
  try {
    if (!modelCache || Date.now() - modelCache.at > MODEL_CACHE_MS) {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !key) return MODEL_FALLBACKS[kind];
      const res = await fetch(
        `${url}/rest/v1/bot_config?select=chat_model,voice_model,ai_default_model,ai_vision_model&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      );
      if (!res.ok) return MODEL_FALLBACKS[kind];
      const rows = await res.json();
      modelCache = { at: Date.now(), row: rows?.[0] ?? {} };
    }
    const value = modelCache.row?.[MODEL_COLUMNS[kind]];
    return typeof value === "string" && value.trim() ? value.trim() : MODEL_FALLBACKS[kind];
  } catch (e) {
    console.warn("getAiModel fallback:", e);
    return MODEL_FALLBACKS[kind];
  }
}
