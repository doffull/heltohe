// Shared Gemini shim: accepts an OpenAI chat/completions request body and
// returns a Response with an OpenAI-shaped JSON (or SSE stream when stream=true).
// This lets all edge functions migrate from Lovable AI Gateway to the user's
// own Gemini API key without changing their request/response handling logic.

const FALLBACK_MODEL = "gemini-2.5-flash";

// In-memory cache of the latest detected Gemini Pro model.
// Refreshed every 5 minutes so when Google releases a new version
// (e.g. gemini-3.7-pro) the site auto-upgrades within minutes.
let _cachedModel: string | null = null;
let _cachedAt = 0;
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;

async function detectLatestProModel(apiKey: string): Promise<string> {
  // Manual override via secret takes priority.
  const override = Deno.env.get("GEMINI_MODEL");
  if (override) return override;

  const now = Date.now();
  if (_cachedModel && now - _cachedAt < MODEL_CACHE_TTL_MS) return _cachedModel;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    if (!r.ok) throw new Error(`models list ${r.status}`);
    const data = await r.json();
    const names: string[] = (data?.models ?? [])
      .map((m: any) => String(m?.name || "").replace(/^models\//, ""))
      .filter((n: string) =>
        /^gemini-\d+(\.\d+)?-pro$/.test(n) && !/preview|exp/i.test(n)
      );
    // Sort by numeric version descending (e.g. 3.5 > 3.1 > 2.5)
    names.sort((a, b) => {
      const va = parseFloat(a.match(/gemini-(\d+(?:\.\d+)?)-pro/)?.[1] ?? "0");
      const vb = parseFloat(b.match(/gemini-(\d+(?:\.\d+)?)-pro/)?.[1] ?? "0");
      return vb - va;
    });
    _cachedModel = names[0] ?? FALLBACK_MODEL;
    _cachedAt = now;
    return _cachedModel;
  } catch (e) {
    console.warn("model auto-detect failed, using fallback:", e);
    _cachedModel = FALLBACK_MODEL;
    _cachedAt = now;
    return FALLBACK_MODEL;
  }
}

function redact(text: string, apiKey: string): string {
  if (!apiKey) return text;
  return text.split(apiKey).join("***REDACTED***");
}


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

function stripVendor(m?: string): string | undefined {
  if (!m) return undefined;
  if (m.startsWith("google/")) m = m.slice("google/".length);
  return m;
}


async function fetchToInlineData(url: string): Promise<{ mime_type: string; data: string }> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid data URL");
    return { mime_type: match[1], data: match[2] };
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch image: ${r.status}`);
  const mime = r.headers.get("content-type") || "image/jpeg";
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return { mime_type: mime, data: btoa(bin) };
}

async function partsFromContent(content: string | OAIContentPart[]): Promise<any[]> {
  if (typeof content === "string") return [{ text: content }];
  const parts: any[] = [];
  for (const p of content) {
    if (p.type === "text") parts.push({ text: p.text });
    else if (p.type === "image_url") {
      parts.push({ inline_data: await fetchToInlineData(p.image_url.url) });
    }
  }
  return parts;
}

async function buildGeminiBody(body: OAIBody) {
  const systemTexts: string[] = [];
  const contents: any[] = [];

  for (const m of body.messages) {
    if (m.role === "system") {
      systemTexts.push(typeof m.content === "string" ? m.content : "");
      continue;
    }
    if (m.role === "tool") {
      // Map tool result back as a function response part
      contents.push({
        role: "user",
        parts: [{ functionResponse: { name: m.name ?? "tool", response: { content: m.content } } }],
      });
      continue;
    }
    const role = m.role === "assistant" ? "model" : "user";
    contents.push({ role, parts: await partsFromContent(m.content) });
  }

  const out: any = { contents };
  if (systemTexts.length) {
    out.system_instruction = { parts: [{ text: systemTexts.join("\n\n") }] };
  }

  const genConfig: any = {};
  if (typeof body.temperature === "number") genConfig.temperature = body.temperature;
  if (body.response_format?.type === "json_object") {
    genConfig.responseMimeType = "application/json";
  }
  if (Object.keys(genConfig).length) out.generationConfig = genConfig;

  if (body.tools?.length) {
    out.tools = [
      {
        function_declarations: body.tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        })),
      },
    ];
    if (body.tool_choice && typeof body.tool_choice === "object" && body.tool_choice.function?.name) {
      out.tool_config = {
        function_calling_config: {
          mode: "ANY",
          allowed_function_names: [body.tool_choice.function.name],
        },
      };
    }
  }

  return out;
}

function geminiCandidateToOpenAIMessage(cand: any) {
  const parts: any[] = cand?.content?.parts ?? [];
  let text = "";
  const tool_calls: any[] = [];
  for (const p of parts) {
    if (typeof p.text === "string") text += p.text;
    if (p.functionCall) {
      tool_calls.push({
        id: `call_${tool_calls.length}_${Date.now()}`,
        type: "function",
        function: {
          name: p.functionCall.name,
          arguments: JSON.stringify(p.functionCall.args ?? {}),
        },
      });
    }
  }
  const message: any = { role: "assistant", content: text || null };
  if (tool_calls.length) message.tool_calls = tool_calls;
  return message;
}

const CORS_PASSTHROUGH = {
  "Access-Control-Allow-Origin": "*",
};

function jsonResponse(status: number, body: any, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_PASSTHROUGH, ...extraHeaders },
  });
}

/**
 * Drop-in replacement for `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { ... })`.
 * Accepts an OpenAI-shaped body, returns a Response in OpenAI shape (JSON or SSE).
 */
export async function callGemini(openaiBody: OAIBody): Promise<Response> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonResponse(500, { error: "GEMINI_API_KEY is not configured" });
  }
  // Prefer caller-specified concrete Gemini model; otherwise auto-detect the
  // latest Pro version from Google so the site upgrades itself when Google
  // ships a new release.
  const callerModel = stripVendor(openaiBody.model);
  const looksLikeGemini = callerModel && /^gemini-/.test(callerModel);
  const model = looksLikeGemini ? callerModel! : await detectLatestProModel(apiKey);
  const stream = !!openaiBody.stream;
  const geminiBody = await buildGeminiBody(openaiBody);

  const url = stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody),
  });

  if (!upstream.ok) {
    const rawText = await upstream.text();
    const text = redact(rawText, apiKey);
    console.error("Gemini error:", upstream.status, text);
    const isBillingIssue = /billing|spend cap|spending cap|monthly spending|payment|paid plan/i.test(text);
    if ((upstream.status === 429 || upstream.status === 403) && isBillingIssue) {
      return jsonResponse(402, {
        error: "Gemini quota or billing limit exceeded. Please review your Google AI Studio billing/spend cap.",
      });
    }
    if (upstream.status === 429) {
      return jsonResponse(429, { error: "Rate limited by Gemini. Please try again later." });
    }
    return jsonResponse(upstream.status, { error: "Gemini API error", details: text });
  }


  if (!stream) {
    const data = await upstream.json();
    const cand = data?.candidates?.[0];
    const message = geminiCandidateToOpenAIMessage(cand);
    const finish_reason = message.tool_calls ? "tool_calls" : "stop";
    const openaiResp = {
      id: `gemini-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, message, finish_reason }],
      usage: data?.usageMetadata
        ? {
            prompt_tokens: data.usageMetadata.promptTokenCount,
            completion_tokens: data.usageMetadata.candidatesTokenCount,
            total_tokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
    return jsonResponse(200, openaiResp);
  }

  // Streaming: translate Gemini SSE to OpenAI-compatible SSE
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body!.getReader();
  const id = `gemini-${Date.now()}`;

  const out = new ReadableStream({
    async start(controller) {
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, idx).replace(/\r$/, "");
            buf = buf.slice(idx + 1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload) continue;
            try {
              const obj = JSON.parse(payload);
              const cand = obj?.candidates?.[0];
              const parts = cand?.content?.parts ?? [];
              for (const p of parts) {
                if (typeof p.text === "string" && p.text.length) {
                  const chunk = {
                    id,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model,
                    choices: [{ index: 0, delta: { content: p.text }, finish_reason: null }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                }
                if (p.functionCall) {
                  const chunk = {
                    id,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model,
                    choices: [
                      {
                        index: 0,
                        delta: {
                          tool_calls: [
                            {
                              index: 0,
                              id: `call_${Date.now()}`,
                              type: "function",
                              function: {
                                name: p.functionCall.name,
                                arguments: JSON.stringify(p.functionCall.args ?? {}),
                              },
                            },
                          ],
                        },
                        finish_reason: null,
                      },
                    ],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                }
              }
            } catch (e) {
              console.warn("SSE parse error:", e, payload.slice(0, 200));
            }
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (e) {
        console.error("stream error:", e);
        controller.error(e);
      }
    },
  });

  return new Response(out, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      ...CORS_PASSTHROUGH,
    },
  });
}
