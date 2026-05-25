// Shared Gemini shim: accepts an OpenAI chat/completions request body and
// returns a Response with an OpenAI-shaped JSON (or SSE stream when stream=true).
// This lets all edge functions migrate from Lovable AI Gateway to the user's
// own Gemini API key without changing their request/response handling logic.

const DEFAULT_MODEL = "gemini-2.5-pro";

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

function mapModel(m?: string): string {
  if (!m) return DEFAULT_MODEL;
  // Strip vendor prefix and normalize old Lovable model ids onto Gemini 2.5 Pro
  // (user explicitly requested Gemini 2.5 Pro for everything).
  if (m.startsWith("google/")) m = m.slice("google/".length);
  // Force Pro for everything as per user preference
  return DEFAULT_MODEL;
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
  const model = mapModel(openaiBody.model);
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
    const text = await upstream.text();
    console.error("Gemini error:", upstream.status, text);
    // Google returns RESOURCE_EXHAUSTED as 429 for both short-term rate limits
    // and billing/spend-cap exhaustion. Keep rate limits as 429, but surface
    // spend/quota/billing exhaustion as 402 so the UI does not show a false
    // "try again later" message when the account needs billing action.
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
