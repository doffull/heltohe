// Virtual Try-On Edge Function
// Uses Lovable AI Gateway (Gemini image model) to composite product(s) onto a
// user's photo OR onto an admin-provided mannequin, with multi-garment layering.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getGeminiApiKey } from '../_shared/gemini.ts';

interface Garment {
  image: string;       // public URL or data URL (main reference)
  /** Additional reference views (back, detail, flat lay…) for better fidelity. */
  images?: string[];
  name?: string;
  category?: string;
  color?: string;
  material?: string;
  size?: string;
}

interface Body {
  mode?: 'photo' | 'mannequin';
  userPhoto?: string;       // photo mode: data URL or base64
  mannequinImage?: string;  // mannequin mode: public URL or data URL
  mannequinProfile?: {
    name?: string;
    gender?: string;
    ageRange?: string;
    skinTone?: string;
    morphology?: string;
    heightCm?: number;
    fitNotes?: string;
  };
  productImage?: string;   // main garment (photo mode / legacy)
  productImages?: string[]; // extra reference views of the main garment
  productName?: string;
  productCategory?: string;
  productMaterial?: string;
  selectedColor?: string;
  selectedSize?: string;
  garments?: Garment[];    // ordered layers (mannequin mode)
  morphology?: string;
  heightCm?: number;
  weightKg?: number;
  gender?: string;
  bust?: string;           // morphological details (optional, free text)
  waist?: string;
  hips?: string;
  shoulders?: string;
  fitPreference?: 'ajusté' | 'normal' | 'ample' | string;
  framing?: 'full' | 'hips' | 'bust';
  /** Adds a second identity/product fidelity pass (slower, much better). */
  highFidelity?: boolean;
}

const stripDataUrl = (s: string) => (s.includes(',') ? s.split(',')[1] : s);
const mimeOfDataUrl = (s: string) =>
  s.startsWith('data:') ? s.substring(5, s.indexOf(';')) : 'image/jpeg';

async function urlToBase64(url: string): Promise<{ b64: string; mime: string }> {
  if (url.startsWith('data:')) return { b64: stripDataUrl(url), mime: mimeOfDataUrl(url) };
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; LovableBot/1.0)',
    'Accept': 'image/*,*/*;q=0.8',
  };
  let lastErr = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers, redirect: 'follow' });
      if (r.ok) {
        const mime = r.headers.get('content-type') || 'image/jpeg';
        const buf = new Uint8Array(await r.arrayBuffer());
        let bin = '';
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        return { b64: btoa(bin), mime };
      }
      lastErr = r.status;
      if (r.status < 500 && r.status !== 429) break;
    } catch (e) {
      console.warn('fetch attempt failed:', e);
    }
    await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
  }
  throw new Error(`Failed to fetch image: ${lastErr || 'network'}`);
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const IMAGE_MODEL = 'google/gemini-2.5-flash-image';
const LOVABLE_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
// L'edge function est coupée à 150 s : on rend la main avant, sinon le client
// reste sur un spinner sans jamais recevoir de réponse (symptôme « chargement
// infini » remonté par le client).
const AI_TIMEOUT_MS = 45_000;

type Img = { b64: string; mime: string };

/**
 * Récupère l'image quelle que soit la forme de la réponse : la passerelle
 * Lovable renvoie `message.images[]`, l'API Google en direct peut renvoyer des
 * parties `inline_data`. On tolère les deux plutôt que de supposer.
 */
function extractImage(data: unknown): string | null {
  const msg = (data as Record<string, any>)?.choices?.[0]?.message;
  if (!msg) return null;

  const fromImages = msg.images?.[0]?.image_url?.url ?? msg.images?.[0]?.url;
  if (typeof fromImages === 'string') return fromImages;

  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      const inline = part?.inline_data ?? part?.inlineData;
      if (inline?.data) {
        const mime = inline.mime_type ?? inline.mimeType ?? 'image/png';
        return `data:${mime};base64,${inline.data}`;
      }
      if (typeof part?.image_url?.url === 'string') return part.image_url.url;
    }
  }
  if (typeof msg.content === 'string' && msg.content.startsWith('data:image')) {
    return msg.content;
  }
  return null;
}

function buildPayload(images: Img[], prompt: string, model: string) {
  return {
    model,
    modalities: ['image', 'text'],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...images.map((im) => ({
            type: 'image_url' as const,
            image_url: { url: `data:${im.mime};base64,${im.b64}` },
          })),
        ],
      },
    ],
  };
}

type CallResult = { image?: string; status?: number; detail?: string; refusal?: boolean };

/**
 * Motifs par lesquels Gemini refuse de produire l'image. Constaté en test :
 * le refus est DÉTERMINISTE pour une photo donnée — trois appels identiques
 * refusés, quand une autre photo de personne réelle passe à chaque fois.
 * Réessayer est donc inutile : il faut changer de photo.
 */
const REFUSAL_REASONS = new Set([
  'IMAGE_OTHER',
  'IMAGE_SAFETY',
  'IMAGE_PROHIBITED_CONTENT',
  'SAFETY',
  'PROHIBITED_CONTENT',
  'BLOCKLIST',
  'SPII',
]);

const REFUSAL_MESSAGE =
  'Cette photo a été refusée par le service de génération. Essayez-en une autre : ' +
  'de face, bien éclairée, une seule personne, sans visage d’enfant ni document visible.';

/**
 * Génération d'image chez Google : il faut l'API NATIVE `:generateContent`
 * avec `responseModalities`. La couche compatible-OpenAI accepte bien la
 * requête mais ne renvoie jamais d'image — elle a produit un « no image in
 * response » au premier essai réel.
 *
 * Les noms de modèles image bougent souvent : on essaie dans l'ordre et on
 * passe au suivant sur un 404.
 */
const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-2.5-flash-image-preview',
  'gemini-2.0-flash-preview-image-generation',
];

async function callGeminiNative(
  apiKey: string,
  model: string,
  images: Img[],
  prompt: string,
): Promise<CallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              ...images.map((im) => ({
                inline_data: { mime_type: im.mime, data: im.b64 },
              })),
            ],
          },
        ],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error(`Gemini natif (${model}) erreur:`, resp.status, txt.slice(0, 500));
      return { status: resp.status, detail: txt.slice(0, 500) };
    }

    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const inline = p?.inlineData ?? p?.inline_data;
      if (inline?.data) {
        const mime = inline.mimeType ?? inline.mime_type ?? 'image/png';
        return { image: `data:${mime};base64,${inline.data}` };
      }
    }

    // Pas d'image : le modèle a répondu du texte. C'est très souvent un refus
    // (photo de personne réelle, contenu jugé sensible). On remonte ce texte
    // plutôt qu'un « no image » opaque — c'est l'information utile.
    const text = parts
      .map((p: Record<string, unknown>) => p?.text)
      .filter((t: unknown): t is string => typeof t === 'string' && !!t.trim())
      .join(' ')
      .slice(0, 300);
    const reason =
      data?.promptFeedback?.blockReason ?? data?.candidates?.[0]?.finishReason ?? null;
    console.error(
      `Gemini natif (${model}) sans image — finishReason=${reason} texte="${text}"`,
      JSON.stringify(data).slice(0, 600),
    );
    // Un refus est déterministe pour une image donnée : réessayer ne sert à
    // rien, il faut changer de photo. On le dit en clair plutôt que de
    // renvoyer le code interne du modèle, incompréhensible pour un client.
    if (reason && REFUSAL_REASONS.has(String(reason))) {
      return { status: 502, detail: REFUSAL_MESSAGE, refusal: true };
    }
    return { status: 502, detail: text || (reason ? `refus (${reason})` : 'no image in response') };
  } catch (e) {
    const name = (e as Error)?.name;
    const timedOut = name === 'TimeoutError' || name === 'AbortError';
    console.error(`Gemini natif (${model}) injoignable:`, name, (e as Error)?.message);
    return { status: timedOut ? 504 : 503, detail: timedOut ? 'timeout' : 'unreachable' };
  }
}

async function callProvider(
  url: string,
  apiKey: string,
  model: string,
  images: Img[],
  prompt: string,
  label: string,
): Promise<CallResult> {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(images, prompt, model)),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error(`${label} error:`, resp.status, txt.slice(0, 500));
      return { status: resp.status, detail: txt.slice(0, 500) };
    }
    const data = await resp.json();
    const img = extractImage(data);
    if (!img) {
      console.error(`${label}: aucune image renvoyée`, JSON.stringify(data).slice(0, 800));
      return { status: 502, detail: 'no image in response' };
    }
    return { image: img };
  } catch (e) {
    const name = (e as Error)?.name;
    const timedOut = name === 'TimeoutError' || name === 'AbortError';
    console.error(`${label} injoignable:`, name, (e as Error)?.message);
    return { status: timedOut ? 504 : 503, detail: timedOut ? 'timeout' : 'unreachable' };
  }
}

/**
 * Un appel de génération d'image. `images` est ordonné : la première est la
 * base (personne / mannequin), les suivantes sont les références produit.
 *
 * Même stratégie que `_shared/gemini.ts` : clé Gemini directe en priorité
 * (configurable depuis Admin → Chatbot), repli sur la passerelle Lovable.
 * Le projet ayant quitté Lovable, la clé Gemini est désormais le chemin normal
 * et la passerelle n'est plus qu'un filet de sécurité.
 */
async function composite(images: Img[], prompt: string): Promise<CallResult> {
  const geminiKey = await getGeminiApiKey();

  if (geminiKey) {
    let direct: CallResult | null = null;
    for (const model of GEMINI_IMAGE_MODELS) {
      direct = await callGeminiNative(geminiKey, model, images, prompt);
      if (direct.image) return direct;
      // Modèle inconnu de ce projet Google → on essaie le nom suivant.
      if (direct.status !== 404) break;
      console.warn(`Modèle ${model} indisponible, essai du suivant`);
    }
    if (direct) {
      // 401/403 = clé refusée : inutile de réessayer ailleurs, on le dit clairement.
      if (direct.status === 401 || direct.status === 403) return direct;
      if (LOVABLE_API_KEY) {
        console.warn('Repli sur la passerelle Lovable après échec Gemini direct');
      } else {
        return direct;
      }
    }
  }

  if (!LOVABLE_API_KEY) {
    return { status: 503, detail: 'no-provider' };
  }
  return await callProvider(
    LOVABLE_URL,
    LOVABLE_API_KEY,
    IMAGE_MODEL,
    images,
    prompt,
    'Passerelle Lovable',
  );
}

function framingText(framing?: string) {
  return framing === 'hips'
    ? 'Output a photograph framed from head to mid-thigh (hips level), centered on the person.'
    : framing === 'bust'
    ? 'Output a photograph framed from head to waist (upper body / bust only), centered on the person.'
    : 'Output a single photorealistic full-body photograph from head to feet.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // Au moins un fournisseur doit être joignable. Avant, l'absence de
    // LOVABLE_API_KEY levait une exception → 500 « LOVABLE_API_KEY missing »,
    // message incompréhensible côté boutique.
    if (!LOVABLE_API_KEY && !(await getGeminiApiKey())) {
      return json(
        {
          error:
            "L'essai virtuel n'est pas configuré. Renseignez une clé Gemini dans Admin → Chatbot → Modèles IA.",
        },
        503,
      );
    }

    const body = (await req.json()) as Body;
    const mode = body.mode === 'mannequin' ? 'mannequin' : 'photo';

    // ---- Build base image + layer list -------------------------------------
    const layers: Garment[] =
      body.garments && body.garments.length
        ? body.garments
        : body.productImage
        ? [{ image: body.productImage, name: body.productName, category: body.productCategory, color: body.selectedColor }]
        : [];

    if (!layers.length) return json({ error: 'Aucun produit à essayer.' }, 400);

    const baseSource = mode === 'mannequin' ? body.mannequinImage : body.userPhoto;
    if (!baseSource) {
      return json({ error: mode === 'mannequin' ? 'mannequinImage required' : 'userPhoto required' }, 400);
    }

    let base = await urlToBase64(baseSource);

    // ---- Subject description ----------------------------------------------
    let subject: string;
    if (mode === 'mannequin') {
      const p = body.mannequinProfile || {};
      subject = [
        p.gender ? `${p.gender}` : null,
        p.ageRange ? `${p.ageRange}` : null,
        p.morphology ? `${p.morphology} build` : null,
        p.skinTone ? `${p.skinTone} skin tone` : null,
        p.heightCm ? `${p.heightCm}cm tall` : null,
      ]
        .filter(Boolean)
        .join(', ');
    } else {
      subject = [
        body.gender || null,
        body.heightCm ? `${body.heightCm}cm tall` : null,
        body.weightKg ? `${body.weightKg}kg` : null,
        `${body.morphology || 'regular'} build`,
        body.shoulders ? `shoulders ${body.shoulders}` : null,
        body.bust ? `chest/bust ${body.bust}` : null,
        body.waist ? `waist ${body.waist}` : null,
        body.hips ? `hips ${body.hips}` : null,
      ]
        .filter(Boolean)
        .join(', ');
    }

    const fitNotes = mode === 'mannequin' ? (body.mannequinProfile?.fitNotes || '') : '';
    const fitPref = body.fitPreference
      ? `Requested fit on the body: ${body.fitPreference}.`
      : '';
    const originalBase = base;

    // ---- Iterative layering ------------------------------------------------
    let lastImage: string | null = null;
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const refs: Img[] = [];
      refs.push(await urlToBase64(layer.image));
      // Up to 3 extra reference views (back / detail / flat lay) for fidelity.
      const extras = (i === 0 ? [...(layer.images || []), ...(body.productImages || [])] : layer.images || [])
        .filter((u) => u && u !== layer.image)
        .slice(0, 3);
      for (const u of extras) {
        try { refs.push(await urlToBase64(u)); } catch { /* skip broken reference */ }
      }

      const label = `${layer.category || 'garment'} ("${layer.name || 'item'}"${layer.color ? `, color ${layer.color}` : ''}${layer.material ? `, material ${layer.material}` : ''}${layer.size ? `, size ${layer.size}` : ''})`;

      const prompt = `Photorealistic virtual try-on. IMAGE 1 is the subject. IMAGE${refs.length > 1 ? 'S 2+' : ' 2'} show the SAME single product: the ${label}. Dress the subject in that exact product.

Subject profile: ${subject || 'adult, regular build'}. ${fitPref}
${i > 0 ? 'The subject already wears previously added pieces — KEEP all of them and add this new piece as an extra coherent layer (correct over/under layering, no removal).' : ''}
${fitNotes ? `Brand styling instructions: ${fitNotes}` : ''}

Absolute rules (identity):
- The face, facial features, expression, hairstyle, hair colour, skin tone, tattoos, glasses, body proportions, height/weight silhouette, pose, camera angle, lens perspective and background must remain IDENTICAL to IMAGE 1. Do not slim, retouch or beautify the body.
- Respect the stated morphology: garment volume, tension and drape must follow that body shape (shoulder width, chest, waist, hips) instead of a generic model shape.

Absolute rules (product fidelity):
- Reproduce the exact silhouette, cut, length, collar, closure, pockets, seams, quilting/panel pattern, texture, sheen, colour and every logo/print/label of the product references. Use the extra reference views for hidden parts (back, sleeves, hood, details).
- No invented details, no colour drift, no restyling, no extra clothing that is not shown.

Rendering:
- Natural fit with realistic folds, contact shadows, occlusion and lighting matched to IMAGE 1 (direction, colour temperature, grain, depth of field).
- ${framingText(body.framing)}
- Single clean photograph: no text, no watermark, no collage, no duplicated limbs, no mirror.`;

      const out = await composite([base, ...refs], prompt);
      if (out.status === 429) return json({ error: 'Trop de requêtes, réessayez dans un instant.' }, 429);
      if (out.status === 402)
        return json({ error: 'Crédits IA épuisés. Rechargez la clé IA configurée.' }, 402);
      if (out.status === 401 || out.status === 403)
        return json(
          { error: 'Clé IA refusée. Vérifiez-la dans Admin → Chatbot → Modèles IA.' },
          503,
        );
      if (out.status === 504)
        return json(
          { error: "Le service IA n'a pas répondu à temps (45 s). Réessayez." },
          504,
        );
      if (out.status === 503)
        return json({ error: 'Service IA injoignable. Réessayez dans un instant.' }, 503);
      // 502 = l'IA a répondu, mais sans image. Le `detail` porte alors son
      // texte de refus, qui est l'information utile : on le montre.
      if (out.status === 502)
        return json(
          {
            // Refus identifié → message directement actionnable, sans préfixe
            // technique. Sinon on expose ce que le modèle a répondu.
            error: out.refusal
              ? out.detail
              : out.detail
              ? `L'IA n'a pas pu générer l'image : ${out.detail}`
              : "L'IA n'a pas renvoyé d'image. Réessayez avec une autre photo.",
            refusal: out.refusal ?? false,
          },
          502,
        );
      if (out.status) return json({ error: 'Erreur IA', detail: out.detail }, 500);
      if (!out.image) {
        return json(
          { error: "L'IA n'a pas pu générer l'image. Réessayez avec une autre photo ou un autre mannequin." },
          500,
        );
      }
      lastImage = out.image;
      base = { b64: stripDataUrl(out.image), mime: mimeOfDataUrl(out.image) };
    }

    // ---- Optional fidelity pass -------------------------------------------
    // Compares the generated result with the original subject and the main
    // product reference, then corrects identity/morphology/product drift.
    if (body.highFidelity && lastImage) {
      try {
        const mainRef = await urlToBase64(layers[0].image);
        const refinePrompt = `Correction pass. IMAGE 1 is the generated try-on result, IMAGE 2 is the original photo of the subject, IMAGE 3 is the real product.

Return an improved version of IMAGE 1 where:
- the subject's face, hair, skin tone, body proportions, pose and background match IMAGE 2 exactly (restore any identity or morphology drift);
- the garment matches IMAGE 3 exactly in cut, length, colour, texture, seams, quilting and logos;
- fit, folds, shadows and lighting look physically plausible.
Keep the same framing and composition as IMAGE 1. Output one photograph only, no text or watermark.`;
        const refined = await composite([base, originalBase, mainRef], refinePrompt);
        if (refined.image) lastImage = refined.image;
      } catch (e) {
        console.warn('refine pass skipped:', e);
      }
    }

    return json({ success: true, image: lastImage });
  } catch (e) {
    console.error('virtual-tryon error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
