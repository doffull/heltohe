// Thin wrapper around Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`)
// Kept named `callGemini` for backward compatibility — no longer calls Google Gemini.
// All requests now go to OpenAI GPT via the native Lovable AI Gateway using LOVABLE_API_KEY.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-5-mini";

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
  function: { name: string; description?: string; parameters: any };
};
type OAIBody = {
  model?: string;
  messages: OAIMessage[];
  stream?: boolean;
  tools?: OAITool[];
  tool_choice?: any;
  response_format?: { type: "json_object" | "text" };
  temperature?: number;
};

const CORS_PASSTHROUGH = { "Access-Control-Allow-Origin": "*" };

function jsonResponse(status: number, body: any, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_PASSTHROUGH, ...extraHeaders },
  });
}

/** Normalize legacy `google/gemini-*` model ids to the current OpenAI default. */
function normalizeModel(m?: string): string {
  if (!m) return DEFAULT_MODEL;
  if (m.startsWith("openai/") || m.startsWith("google/")) return m;
  return DEFAULT_MODEL;
}

/**
 * Drop-in replacement kept for compatibility with existing callers.
 * Sends the request to the Lovable AI Gateway with an OpenAI model.
 */
export async function callGemini(openaiBody: OAIBody): Promise<Response> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return jsonResponse(500, { error: "LOVABLE_API_KEY is not configured" });
  }

  const body = { ...openaiBody, model: normalizeModel(openaiBody.model) };

  const upstream = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    console.error("AI gateway error:", upstream.status, text.slice(0, 500));
    if (upstream.status === 429) {
      return jsonResponse(429, { error: "Trop de requêtes IA. Réessayez dans quelques instants." });
    }
    if (upstream.status === 402) {
      return jsonResponse(402, { error: "Crédits IA épuisés. Rechargez votre workspace Lovable." });
    }
    return jsonResponse(upstream.status, { error: "AI gateway error", details: text.slice(0, 500) });
  }

  // Passthrough (JSON or SSE)
  const headers = new Headers(upstream.headers);
  Object.entries(CORS_PASSTHROUGH).forEach(([k, v]) => headers.set(k, v));
  return new Response(upstream.body, { status: upstream.status, headers });
}
