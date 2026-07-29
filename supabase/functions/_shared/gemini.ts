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

export async function callGemini(body: OAIBody): Promise<Response> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return jsonResponse(500, { error: "LOVABLE_API_KEY is not configured" });

  const payload = { ...body, model: pickModel(body.model) };

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
