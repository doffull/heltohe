// Retouche IA de pose / expression d'une image produit (admin uniquement).
// Le vêtement, le mannequin, le décor et le cadrage restent identiques.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Body {
  imageUrl: string;
  pose?: string;
  expression?: string;
  extraNotes?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function fetchAsBase64(url: string): Promise<{ b64: string; mime: string }> {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LovableBot/1.0)', Accept: 'image/*' },
    redirect: 'follow',
  });
  if (!r.ok) throw new Error(`Image source inaccessible (${r.status})`);
  const mime = r.headers.get('content-type') || 'image/jpeg';
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return { b64: btoa(bin), mime };
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!LOVABLE_API_KEY) return json({ error: 'LOVABLE_API_KEY manquante' }, 500);

    // --- Auth : réservé aux administrateurs ---
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Non authentifié' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: 'Session invalide' }, 401);

    const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    if (roleErr) return json({ error: 'Vérification du rôle impossible' }, 500);
    if (!isAdmin) return json({ error: 'Accès réservé aux super admins' }, 403);

    const body = (await req.json()) as Body;
    if (!body?.imageUrl) return json({ error: 'imageUrl requise' }, 400);

    const pose = (body.pose || '').trim();
    const expression = (body.expression || '').trim();
    if (!pose && !expression) return json({ error: 'Indiquez une pose ou une expression' }, 400);

    const src = await fetchAsBase64(body.imageUrl);

    const prompt = `Retouche photo professionnelle e-commerce mode.

À MODIFIER, uniquement :
${pose ? `- Nouvelle pose du mannequin : ${pose}.` : ''}
${expression ? `- Nouvelle expression du visage : ${expression}.` : ''}
${body.extraNotes ? `- Précision : ${body.extraNotes}.` : ''}

À PRÉSERVER À L'IDENTIQUE (impératif) :
- Le vêtement : coupe, longueur, couleur exacte, matière, motifs, coutures, fermetures, logos et étiquettes. Aucune déformation, aucun rétrécissement, aucun ajout ni retrait de vêtement ou d'accessoire.
- Le mannequin : même personne, même visage, même morphologie, même carnation, même coiffure.
- Le décor, l'arrière-plan, le sol, le cadrage, l'échelle du sujet, l'objectif et l'éclairage (direction, température, intensité, ombres).
- Le format et les proportions de l'image.

Rendu photoréaliste, plis et ombres du tissu cohérents avec la nouvelle posture. Aucun texte, aucun filigrane, aucun collage, une seule image en sortie.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${src.mime};base64,${src.b64}` } },
            ],
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error('AI gateway error', aiResp.status, txt.slice(0, 500));
      if (aiResp.status === 429) return json({ error: 'Trop de requêtes IA, réessayez dans un instant.' }, 429);
      if (aiResp.status === 402) return json({ error: 'Crédits IA épuisés.' }, 402);
      return json({ error: 'Erreur IA', detail: txt.slice(0, 300) }, 500);
    }

    const data = await aiResp.json();
    const b64: string | undefined =
      data?.data?.[0]?.b64_json ||
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url?.split(',')?.pop();

    if (!b64) {
      console.error('No image returned', JSON.stringify(data).slice(0, 600));
      return json({ error: "L'IA n'a pas renvoyé d'image. Réessayez." }, 500);
    }

    const bytes = base64ToBytes(b64);
    const path = `products/ai-pose/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
    const { error: upErr } = await admin.storage.from('media').upload(path, bytes, {
      contentType: 'image/png',
      upsert: true,
    });
    if (upErr) {
      console.error('upload error', upErr);
      return json({ error: 'Enregistrement dans la médiathèque impossible' }, 500);
    }
    const { data: pub } = admin.storage.from('media').getPublicUrl(path);

    return json({ success: true, image: pub.publicUrl });
  } catch (e) {
    console.error('image-pose-edit error', e);
    return json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, 500);
  }
});
