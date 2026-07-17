// Virtual Try-On Edge Function
// Uses Lovable AI Gateway (Gemini image preview model) to composite a product onto a user's photo.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body {
  userPhoto: string;      // data URL or base64
  productImage: string;   // public URL
  productName?: string;
  productCategory?: string;
  selectedColor?: string;
  morphology?: string;    // slim | regular | athletic | curvy
  heightCm?: number;
  weightKg?: number;
  gender?: string;
  framing?: 'full' | 'hips' | 'bust';
}

const stripDataUrl = (s: string) => s.includes(',') ? s.split(',')[1] : s;

async function urlToBase64(url: string): Promise<{ b64: string; mime: string }> {
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
  throw new Error(`Failed to fetch product image: ${lastErr || 'network'}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

    const body = await req.json() as Body;
    if (!body.userPhoto || !body.productImage) {
      return new Response(JSON.stringify({ error: 'userPhoto and productImage required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userB64 = stripDataUrl(body.userPhoto);
    const userMime = body.userPhoto.startsWith('data:')
      ? body.userPhoto.substring(5, body.userPhoto.indexOf(';'))
      : 'image/jpeg';
    const product = await urlToBase64(body.productImage);

    const morpho = body.morphology || 'regular';
    const sizeInfo = [
      body.heightCm ? `${body.heightCm}cm tall` : null,
      body.weightKg ? `${body.weightKg}kg` : null,
      body.gender || null,
      `${morpho} build`,
    ].filter(Boolean).join(', ');

    const framing = body.framing || 'full';
    const framingInstruction =
      framing === 'hips'
        ? 'Output a photograph framed from head to mid-thigh (hips level), centered on the person.'
        : framing === 'bust'
        ? 'Output a photograph framed from head to waist (upper body / bust only), centered on the person.'
        : 'Output a single photorealistic full-body photograph from head to feet.';

    const prompt = `Virtual try-on task: Take the person in the FIRST image and realistically dress them in the ${body.productCategory || 'garment'} ("${body.productName || 'item'}"${body.selectedColor ? `, color ${body.selectedColor}` : ''}) shown in the SECOND image.

Person profile: ${sizeInfo}.

Requirements:
- Preserve the person's face, hair, skin tone, pose and the original background EXACTLY.
- Fit the garment naturally to the body proportions, with realistic folds, shadows, and lighting matching the original photo.
- Keep the garment's color, pattern, logos, and design details faithful to the product image.
- ${framingInstruction}
- No text, no watermarks, no collage.`;

    // Use OpenAI gpt-image-2 via /v1/images/edits (multipart, supports multiple input images).
    const form = new FormData();
    form.append('model', 'openai/gpt-image-2');
    form.append('prompt', prompt);
    form.append('quality', 'low');
    form.append('size', '1024x1024');
    const userBin = Uint8Array.from(atob(userB64), (c) => c.charCodeAt(0));
    const prodBin = Uint8Array.from(atob(product.b64), (c) => c.charCodeAt(0));
    form.append('image[]', new Blob([userBin], { type: userMime }), 'person.jpg');
    form.append('image[]', new Blob([prodBin], { type: product.mime }), 'garment.jpg');

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: form,
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error('AI gateway error:', aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'Trop de requêtes, réessayez dans un instant.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA épuisés. Rechargez votre workspace Lovable.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Erreur IA', detail: txt.slice(0, 500) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiResp.json();
    // OpenAI images API: data[0].b64_json (or .url)
    const first = data?.data?.[0];
    let imageUrl: string | null = null;
    if (first?.b64_json) {
      imageUrl = `data:image/png;base64,${first.b64_json}`;
    } else if (typeof first?.url === 'string') {
      imageUrl = first.url;
    }

    if (!imageUrl) {
      console.error('No image returned', JSON.stringify(data).slice(0, 800));
      return new Response(JSON.stringify({ error: "L'IA n'a pas pu générer l'image. Réessayez avec une autre photo." }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, image: imageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('virtual-tryon error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
