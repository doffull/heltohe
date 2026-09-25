// Bon de préparation complet, en PDF, étiquette Colissimo incluse.
//
// Pourquoi côté serveur : l'écran /admin/bordereau/:id assemblait le bon en
// HTML et confiait l'impression au navigateur. Or l'étiquette est un PDF monté
// dans un <object> — un plugin — et sa seule présence fait échouer
// `window.print()` sans le moindre message. Aucun réglage CSS n'y change quoi
// que ce soit.
//
// Ici le document est produit d'un bloc : le bon est dessiné, l'étiquette y est
// incrustée, et il ne reste qu'un fichier à imprimer, à archiver ou à joindre.
// C'est aussi la seule mise en page du bon — l'écran n'en affiche que l'aperçu,
// pour qu'il n'existe jamais deux rendus divergents.
//
// ⚠️ Générer une étiquette, c'est affranchir un colis pour de bon. Cette
// fonction ne le fait donc QUE si la commande n'en a aucune. Pour en refaire
// une, il y a le bouton dédié de l'écran.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1?target=deno';
import { renderOrderSlip } from './layout.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Mise en page : voir `layout.ts` (testable hors Supabase).

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: claimsData, error: authError } = await userClient.auth.getClaims(
    authHeader.replace('Bearer ', ''),
  );
  if (authError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);

  const { data: isAdmin } = await userClient.rpc('has_role', {
    _user_id: claimsData.claims.sub,
    _role: 'admin',
  });
  if (!isAdmin) return json({ error: 'Forbidden: admin role required' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const orderId = typeof body.order_id === 'string' ? body.order_id : '';
  if (!orderId) return json({ error: 'order_id is required' }, 400);

  // ⚠️ Affranchir coûte de l'argent et engage un colis auprès de La Poste : on
  // ne le fait JAMAIS sans demande explicite. L'écran appelle cette fonction à
  // chaque ouverture pour afficher l'aperçu ; sans ce drapeau, visiter la page
  // d'une commande non étiquetée l'affranchirait au passage.
  const allowLabelCreation = body.allow_label_creation === true;

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) return json({ error: orderError.message }, 500);
  if (!order) return json({ error: 'Order not found' }, 404);

  // ─── Étiquette : on réutilise, on ne réaffranchit pas ─────────────────────
  let labelBytes: Uint8Array | null = null;
  let labelGenerated = false;

  if (order.label_path) {
    const { data: file } = await admin.storage.from('labels').download(order.label_path);
    if (file) labelBytes = new Uint8Array(await file.arrayBuffer());
  }

  if (!labelBytes && !order.tracking_number && allowLabelCreation) {
    // Aucune étiquette, aucun suivi : la commande n'a jamais été affranchie.
    // On délègue à la fonction qui sait le faire, avec le jeton de l'admin.
    const res = await fetch(`${supabaseUrl}/functions/v1/create-colissimo-label`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || payload?.error) {
      return json(
        {
          error: "L'étiquette Colissimo n'a pas pu être générée",
          details: payload?.details || payload?.error || `HTTP ${res.status}`,
        },
        res.status === 200 ? 422 : res.status,
      );
    }
    labelGenerated = true;
    if (typeof payload?.pdfBase64 === 'string') {
      labelBytes = Uint8Array.from(atob(payload.pdfBase64), (c) => c.charCodeAt(0));
    }
    // La commande vient d'être mise à jour par l'appel ci-dessus.
    const { data: fresh } = await admin
      .from('orders')
      .select('label_path, label_url, tracking_number')
      .eq('id', orderId)
      .maybeSingle();
    if (fresh) Object.assign(order, fresh);
  } else if (!labelBytes && order.tracking_number) {
    // Cas limite : un suivi existe mais le fichier a disparu du stockage. On
    // s'abstient de réaffranchir — ce serait un second colis pour La Poste.
    labelBytes = null;
  }

  // ─── Le bon de commande ───────────────────────────────────────────────────
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Bon de commande ${order.order_number}`);
  pdf.setCreator('HELVETICA-MP');
  const labelOk = await renderOrderSlip(pdf, order, labelBytes);

  const bytes = await pdf.save();

  // Archivé pour être réimprimé sans jamais rappeler Colissimo — sauf pour
  // l'impression groupée (`archive: false`), qui fusionne côté navigateur et
  // n'a que faire d'un fichier de plus par commande à chaque clic.
  let path: string | null = null;
  let signedUrl: string | null = null;
  if (body.archive !== false) {
    path = `${orderId}/bon-${Date.now()}.pdf`;
    await admin.storage.from('labels').upload(path, bytes, {
      contentType: 'application/pdf',
      upsert: true,
    });
    const { data: signed } = await admin.storage.from('labels').createSignedUrl(path, 60 * 60 * 24 * 7);
    signedUrl = signed?.signedUrl ?? null;
  }

  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }

  return json({
    success: true,
    path,
    signedUrl,
    trackingNumber: order.tracking_number ?? null,
    labelGenerated,
    // Un cadre vide à la place de l'étiquette : l'écran groupé le signale.
    labelMissing: !labelOk,
    pdfBase64: btoa(binary),
  });
});
