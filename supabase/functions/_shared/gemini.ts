// AI routing shim.
//
// TEXT-ONLY requests → DeepSeek (https://api.deepseek.com/v1) via DEEPSEEK_API_KEY.
// VISION requests (any user message with an `image_url` content part) → Lovable AI
// Gateway (https://ai.gateway.lovable.dev/v1) via LOVABLE_API_KEY, since DeepSeek
// chat/reasoner do not accept image inputs.
//
// The exported name `callGemini` is kept for backward compatibility — every
// existing edge function keeps working without edits.

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEEPSEEK_DEFAULT = "deepseek-chat";
const DEEPSEEK_REASONER = "deepseek-reasoner";
const LOVABLE_VISION_DEFAULT = "google/gemini-2.5-flash";

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

function hasVisionContent(messages: OAIMessage[]): boolean {
  return messages.some((m) =>
    Array.isArray(m.content) && m.content.some((p) => p && (p as OAIContentPart).type === "image_url"),
  );
}

/** Normalize a caller-provided model id to the DeepSeek default when routing to DeepSeek. */
function deepseekModel(m?: string): string {
  if (!m) return DEEPSEEK_DEFAULT;
  if (m === DEEPSEEK_REASONER || m === DEEPSEEK_DEFAULT) return m;
  if (/reason/i.test(m)) return DEEPSEEK_REASONER;
  return DEEPSEEK_DEFAULT;
}

function lovableVisionModel(m?: string): string {
  if (m && (m.startsWith("openai/") || m.startsWith("google/"))) return m;
  return LOVABLE_VISION_DEFAULT;
}

async function callDeepseek(body: OAIBody): Promise<Response> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) return jsonResponse(500, { error: "DEEPSEEK_API_KEY is not configured" });

  const payload = { ...body, model: deepseekModel(body.model) };

  const upstream = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    console.error("DeepSeek error:", upstream.status, text.slice(0, 500));
    if (upstream.status === 429) {
      return jsonResponse(429, { error: "L'IA (DeepSeek) est saturée. Réessayez dans quelques instants." });
    }
    if (upstream.status === 402 || upstream.status === 401 || upstream.status === 403) {
      return jsonResponse(upstream.status, {
        error: "Crédits DeepSeek épuisés ou clé invalide. Rechargez votre compte DeepSeek.",
      });
    }
    return jsonResponse(upstream.status, { error: "DeepSeek error", details: text.slice(0, 500) });
  }

  const headers = new Headers(upstream.headers);
  Object.entries(CORS_PASSTHROUGH).forEach(([k, v]) => headers.set(k, v));
  return new Response(upstream.body, { status: upstream.status, headers });
}

async function callLovableGateway(body: OAIBody): Promise<Response> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return jsonResponse(500, { error: "LOVABLE_API_KEY is not configured" });

  const payload = { ...body, model: lovableVisionModel(body.model) };

  const upstream = await fetch(LOVABLE_URL, {
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

/**
 * Backward-compatible entry point. Routes to DeepSeek for text-only calls,
 * Lovable AI Gateway when any message includes an image (vision).
 */
export async function callGemini(body: OAIBody): Promise<Response> {
  if (hasVisionContent(body.messages || [])) {
    return callLovableGateway(body);
  }
  return callDeepseek(body);
}
