// Virtual Try-On Edge Function
// Uses Lovable AI Gateway (Gemini image model) to composite product(s) onto a
// user's photo OR onto an admin-provided mannequin, with multi-garment layering.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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
  productName?: string;
  productCategory?: string;
  selectedColor?: string;
  garments?: Garment[];    // ordered layers (mannequin mode)
  morphology?: string;
  heightCm?: number;
  weightKg?: number;
  gender?: string;
  framing?: 'full' | 'hips' | 'bust';
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

async function composite(
  base: { b64: string; mime: string },
  garment: { b64: string; mime: string },
  prompt: string,
): Promise<{ image?: string; status?: number; detail?: string }> {
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      modalities: ['image', 'text'],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${base.mime};base64,${base.b64}` } },
            { type: 'image_url', image_url: { url: `data:${garment.mime};base64,${garment.b64}` } },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error('AI gateway error:', resp.status, txt);
    return { status: resp.status, detail: txt.slice(0, 500) };
  }
  const data = await resp.json();
  const msg = data?.choices?.[0]?.message;
  const img = msg?.images?.[0]?.image_url?.url ?? msg?.images?.[0]?.url;
  if (typeof img !== 'string') {
    console.error('No image returned', JSON.stringify(data).slice(0, 800));
    return {};
  }
  return { image: img };
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
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

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
        body.heightCm ? `${body.heightCm}cm tall` : null,
        body.weightKg ? `${body.weightKg}kg` : null,
        body.gender || null,
        `${body.morphology || 'regular'} build`,
      ]
        .filter(Boolean)
        .join(', ');
    }

    const fitNotes = mode === 'mannequin' ? (body.mannequinProfile?.fitNotes || '') : '';

    // ---- Iterative layering ------------------------------------------------
    let lastImage: string | null = null;
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const garment = await urlToBase64(layer.image);
      const label = `${layer.category || 'garment'} ("${layer.name || 'item'}"${layer.color ? `, color ${layer.color}` : ''})`;

      const prompt = `Virtual try-on task: Take the person in the FIRST image and realistically dress them in the ${label} shown in the SECOND image.

Person profile: ${subject || 'adult, regular build'}.
${i > 0 ? 'The person is already wearing previously added items — KEEP every garment already worn and simply add this new piece as an additional layer, coherently combined with the existing outfit.' : ''}
${fitNotes ? `Styling instructions from the brand: ${fitNotes}` : ''}

Requirements:
- Preserve the person's face, hair, skin tone, body proportions, pose and the original background EXACTLY.
- Fit the item naturally to the body, with realistic folds, shadows and lighting matching the original photo.
- Keep the item's color, pattern, logos and design details faithful to the product image.
- ${framingText(body.framing)}
- No text, no watermarks, no collage, no duplicated limbs.`;

      const out = await composite(base, garment, prompt);
      if (out.status === 429) return json({ error: 'Trop de requêtes, réessayez dans un instant.' }, 429);
      if (out.status === 402)
        return json({ error: 'Crédits IA épuisés. Rechargez votre workspace Lovable.' }, 402);
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

    return json({ success: true, image: lastImage });
  } catch (e) {
    console.error('virtual-tryon error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
