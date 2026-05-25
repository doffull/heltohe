// Shared helpers for AI-driven extraction edge functions
// (mockup analysis, PDF product import, PDF stock import, WP sync, etc.)
//
// Goals:
//  - Single retry policy for transient Gemini failures (429/5xx/timeout).
//  - Safe JSON extraction from model output (handles markdown fences and prose).
//  - Uniform FR error mapping so the UI always shows a useful message.

import { callGemini } from "./gemini.ts";

export type AIExtractionError = {
  status: number;
  message: string;
};

/** Run an async operation with bounded retries on transient errors. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const base = opts.baseDelayMs ?? 800;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const transient =
        /429|timeout|fetch failed|ECONNRESET|ETIMEDOUT|5\d\d|temporar/i.test(msg);
      if (!transient || attempt === retries) break;
      const delay = base * Math.pow(2, attempt);
      console.warn(`[${opts.label ?? "ai"}] retry ${attempt + 1}/${retries} in ${delay}ms — ${msg}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Call Gemini and return the assistant text content, retrying on transient errors. */
export async function callGeminiText(
  body: Parameters<typeof callGemini>[0],
  label?: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  try {
    const resp = await withRetry(() => callGemini(body), { label });
    if (!resp.ok) {
      let message = "Erreur IA";
      try {
        const j = await resp.clone().json();
        message = j?.error || message;
      } catch { /* ignore */ }
      if (resp.status === 402) {
        return { ok: false, status: 402, message: "Quota Google Gemini épuisé. Vérifiez votre plafond de dépense dans Google AI Studio." };
      }
      if (resp.status === 429) {
        return { ok: false, status: 429, message: "Gemini est temporairement saturé. Réessayez dans quelques instants." };
      }
      return { ok: false, status: resp.status, message };
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return { ok: true, text };
  } catch (e) {
    console.error(`[${label ?? "ai"}] callGeminiText failed:`, e);
    return { ok: false, status: 500, message: "Erreur interne lors de l'appel à l'IA." };
  }
}

/** Parse JSON from a model response, tolerating markdown fences and surrounding prose. */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  // Strip markdown fences
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  // Try direct parse
  try { return JSON.parse(cleaned) as T; } catch { /* fall through */ }
  // Try to find first JSON array or object substring
  const arr = cleaned.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]) as T; } catch { /* ignore */ } }
  const obj = cleaned.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]) as T; } catch { /* ignore */ } }
  return null;
}
