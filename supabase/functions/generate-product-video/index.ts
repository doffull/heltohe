// Runtime AI video generation for product cards.
// Provider: Google Veo 3 via Lovable AI Gateway (image-to-video).
// The gateway key (LOVABLE_API_KEY) is auto-provisioned; nothing to configure.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "google/veo-3.0-generate-preview";
const MAX_POLL_MS = 180_000; // 3 minutes hard cap
const POLL_INTERVAL_MS = 3_000;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function fetchWithRetry(url: string, tries = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          Accept: "image/*,*/*;q=0.8",
        },
      });
      if (r.ok) return r;
      lastErr = new Error(`HTTP ${r.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((res) => setTimeout(res, 400 * (i + 1)));
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetch failed");
}

async function imageToBase64(url: string): Promise<{ b64: string; mime: string }> {
  const r = await fetchWithRetry(url);
  const mime = r.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return { b64: btoa(bin), mime };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_KEY) return json(500, { error: "LOVABLE_API_KEY missing" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth: require an admin caller
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Auth requise" });

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json(401, { error: "Session invalide" });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json(403, { error: "Réservé aux administrateurs" });

  let body: {
    imageUrl?: string;
    prompt?: string;
    durationSec?: number;
    aspectRatio?: "16:9" | "9:16" | "1:1";
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON invalide" });
  }

  const imageUrl = String(body.imageUrl || "").trim();
  if (!imageUrl) return json(400, { error: "imageUrl requis" });
  const durationSec = Math.min(10, Math.max(4, Number(body.durationSec) || 6));
  const aspectRatio = (body.aspectRatio as string) || "9:16";
  const prompt =
    (body.prompt && String(body.prompt).slice(0, 500)) ||
    "Cinematic slow-motion product showcase, subtle dolly-in camera move, soft studio lighting, luxury fashion mood, no text, no logo overlays.";

  // 1. Fetch product image → base64
  let img: { b64: string; mime: string };
  try {
    img = await imageToBase64(imageUrl);
  } catch (e) {
    return json(502, { error: `Impossible de charger l'image: ${(e as Error).message}` });
  }

  // 2. Start Veo generation
  const startPayload = {
    model: MODEL,
    prompt,
    image: { data: img.b64, mime_type: img.mime },
    duration_seconds: durationSec,
    aspect_ratio: aspectRatio,
    with_audio: false,
  };

  const startRes = await fetch(`${GATEWAY}/videos/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(startPayload),
  });

  if (!startRes.ok) {
    const t = await startRes.text();
    console.error("Veo start error", startRes.status, t.slice(0, 500));
    if (startRes.status === 429)
      return json(429, { error: "L'IA vidéo est saturée. Réessayez dans quelques instants." });
    if (startRes.status === 402)
      return json(402, { error: "Crédits IA épuisés. Rechargez votre workspace Lovable." });
    if (startRes.status === 404 || startRes.status === 400)
      return json(startRes.status, {
        error:
          "Génération vidéo IA indisponible pour ce workspace. Utilisez le mode rapide (canvas) en attendant.",
        details: t.slice(0, 300),
      });
    return json(startRes.status, { error: "Erreur Veo", details: t.slice(0, 300) });
  }

  const startJson = await startRes.json();
  const operationName: string | undefined =
    startJson?.name || startJson?.operation || startJson?.id;

  let videoUrl: string | undefined;
  let videoB64: string | undefined;

  if (startJson?.video?.url) {
    videoUrl = startJson.video.url;
  } else if (startJson?.video?.data) {
    videoB64 = startJson.video.data;
  } else if (operationName) {
    // 3. Poll
    const deadline = Date.now() + MAX_POLL_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const opRes = await fetch(
        `${GATEWAY}/videos/operations/${encodeURIComponent(operationName)}`,
        { headers: { Authorization: `Bearer ${LOVABLE_KEY}` } },
      );
      if (!opRes.ok) {
        const t = await opRes.text();
        console.error("Veo poll error", opRes.status, t.slice(0, 300));
        continue;
      }
      const op = await opRes.json();
      if (op?.done || op?.status === "completed" || op?.state === "SUCCEEDED") {
        videoUrl = op?.result?.video?.url || op?.video?.url || op?.response?.video?.url;
        videoB64 = op?.result?.video?.data || op?.video?.data || op?.response?.video?.data;
        break;
      }
      if (op?.error) {
        return json(502, { error: op.error?.message || "Génération vidéo échouée" });
      }
    }
  }

  if (!videoUrl && !videoB64) {
    return json(504, { error: "Timeout génération vidéo (>3 min). Réessayez." });
  }

  // 4. Fetch bytes if URL, then upload to Storage
  let bytes: Uint8Array;
  if (videoUrl) {
    const vr = await fetch(videoUrl, {
      headers: { Authorization: `Bearer ${LOVABLE_KEY}` },
    });
    if (!vr.ok) return json(502, { error: `Échec récupération vidéo (${vr.status})` });
    bytes = new Uint8Array(await vr.arrayBuffer());
  } else {
    const bin = atob(videoB64!);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  }

  const filename = `products/videos/ai-${crypto.randomUUID()}.mp4`;
  const { error: upErr } = await admin.storage
    .from("media")
    .upload(filename, bytes, { contentType: "video/mp4", upsert: false });
  if (upErr) return json(500, { error: `Upload Storage échoué: ${upErr.message}` });

  const { data: pub } = admin.storage.from("media").getPublicUrl(filename);
  return json(200, {
    url: pub.publicUrl,
    model: MODEL,
    durationSec,
    aspectRatio,
  });
});
