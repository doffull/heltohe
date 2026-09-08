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
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1?target=deno';

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

// ─── Mise en page ───────────────────────────────────────────────────────────
// A4 paysage, en points PostScript (72 dpi) : c'est l'orientation historique
// du bon, et la seule qui laisse l'étiquette 10x15 tenir à sa taille réelle à
// côté du récapitulatif, sans réduction.
const A4 = { w: 841.89, h: 595.28 };
const MARGIN = 36;
// Colonne de gauche : l'étiquette. Colonne de droite : le bon.
const LABEL_W = 330;
const GUTTER = 24;
const RIGHT_X = MARGIN + LABEL_W + GUTTER;
const RIGHT_EDGE = A4.w - MARGIN;
// Colonnes chiffrées du tableau d'articles, calées sur le bord droit.
const COL_QTY = RIGHT_EDGE - 190;
const COL_UNIT = RIGHT_EDGE - 95;
const BLACK = rgb(0, 0, 0);
const GREY = rgb(0.45, 0.45, 0.45);
const RULE = rgb(0.8, 0.8, 0.8);

/**
 * Les polices standard de pdf-lib encodent en WinAnsi : les accents passent,
 * mais le tiret cadratin et l'apostrophe courbe — fréquents dans les adresses
 * saisies au téléphone — lèvent une exception à l'écriture. On les rabat sur
 * leurs équivalents ASCII plutôt que d'embarquer une police de 300 Ko.
 */
function win(text: unknown): string {
  return String(text ?? '')
    .replace(/[—–]/g, '-')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    // Tout ce qui sort du latin-1 est écarté : mieux vaut un caractère manquant
    // qu'un PDF qui n'est jamais produit.
    .replace(/[^\x20-\xFF\n]/g, '');
}

const euro = (n: unknown) => `${Number(n || 0).toFixed(2)} EUR`;

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

  // ─── Le bon ───────────────────────────────────────────────────────────────
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Bon de preparation ${order.order_number}`);
  pdf.setCreator('HELVETICA-MP');
  const page = pdf.addPage([A4.w, A4.h]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // `y` descend au fil du dessin ; chaque aide écrit à la position courante.
  let y = A4.h - MARGIN;
  const text = (
    s: unknown,
    opts: { x?: number; size?: number; bold?: boolean; color?: typeof BLACK } = {},
  ) => {
    page.drawText(win(s), {
      x: opts.x ?? RIGHT_X,
      y,
      size: opts.size ?? 10,
      font: opts.bold ? bold : font,
      color: opts.color ?? BLACK,
    });
  };
  const rightText = (s: unknown, right: number, size = 10, useBold = false) => {
    const str = win(s);
    const f = useBold ? bold : font;
    page.drawText(str, { x: right - f.widthOfTextAtSize(str, size), y, size, font: f });
  };
  const rule = (yy: number, color = RULE, thickness = 0.5) => {
    page.drawLine({
      start: { x: RIGHT_X, y: yy },
      end: { x: RIGHT_EDGE, y: yy },
      thickness,
      color,
    });
  };

  // ── Colonne de droite : le bon ──
  text('BON DE PREPARATION', { size: 15, bold: true });
  rightText(order.order_number, RIGHT_EDGE, 13, true);
  y -= 15;
  const created = order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : '';
  text(`Commande du ${created}`, { size: 9, color: GREY });
  rightText(`Edite le ${new Date().toLocaleDateString('fr-FR')}`, RIGHT_EDGE, 9);
  y -= 10;
  rule(y, BLACK, 1);
  y -= 20;

  text('DESTINATAIRE', { size: 9, bold: true, color: GREY });
  y -= 14;
  text(order.customer_name, { size: 11, bold: true });
  y -= 13;
  for (const line of [
    order.customer_address,
    `${order.customer_zip || ''} ${order.customer_city || ''}`.trim(),
    order.customer_country,
    order.customer_phone,
    order.customer_email,
  ]) {
    if (!String(line || '').trim()) continue;
    // Une adresse de point relais dépasse largement la colonne : on la coupe
    // sur les espaces plutôt que de la laisser déborder de la page.
    const chunks = String(line).match(/.{1,58}(\s|$)/g) || [String(line)];
    for (const chunk of chunks) {
      text(chunk.trim(), { size: 9 });
      y -= 12;
    }
  }

  y -= 4;
  if (order.tracking_number) {
    text(`Suivi Colissimo : ${order.tracking_number}`, { size: 9, bold: true });
    y -= 18;
  }

  rule(y + 6);
  y -= 8;
  text('PRODUIT', { size: 9, bold: true, color: GREY });
  rightText('QTE', COL_QTY, 9, true);
  rightText('PRIX UNIT.', COL_UNIT, 9, true);
  rightText('TOTAL', RIGHT_EDGE, 9, true);
  y -= 6;
  rule(y);
  y -= 14;

  const items = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];
  let overflow = 0;
  for (const item of items) {
    // En paysage la colonne est plus étroite : on s'arrête avant les totaux
    // et on annonce le reste, plutôt que d'écrire par-dessus.
    if (y < MARGIN + 90) {
      overflow = items.length - items.indexOf(item);
      break;
    }
    const label = [item.name, item.size ? `taille ${item.size}` : '', item.color]
      .filter(Boolean)
      .join(' - ');
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    text(String(label).slice(0, 46), { size: 9 });
    rightText(String(qty), COL_QTY, 9);
    rightText(euro(price), COL_UNIT, 9);
    rightText(euro(price * qty), RIGHT_EDGE, 9);
    y -= 13;
  }
  if (overflow > 0) {
    text(`... et ${overflow} article(s) supplementaire(s)`, { size: 8, color: GREY });
    y -= 13;
  }

  y -= 4;
  rule(y);
  y -= 14;
  for (const [label, value, strong] of [
    ['Sous-total', euro(order.subtotal), false],
    ['Frais de livraison', euro(order.shipping_cost), false],
    ['TOTAL', euro(order.total), true],
  ] as const) {
    rightText(label, COL_UNIT, strong ? 11 : 9, strong);
    rightText(value, RIGHT_EDGE, strong ? 11 : 9, strong);
    y -= strong ? 16 : 13;
  }

  // ── Colonne de gauche : l'étiquette ──
  const boxTop = A4.h - MARGIN;
  const boxY = MARGIN + 14;
  page.drawRectangle({
    x: MARGIN,
    y: boxY,
    width: LABEL_W,
    height: boxTop - boxY,
    borderColor: RULE,
    borderWidth: 0.5,
    borderDashArray: [4, 3],
  });
  const caption = win('Decoupez et collez sur le colis');
  page.drawText(caption, {
    x: MARGIN + (LABEL_W - font.widthOfTextAtSize(caption, 8)) / 2,
    y: MARGIN + 4,
    size: 8,
    font,
    color: GREY,
  });

  if (labelBytes) {
    try {
      const src = await PDFDocument.load(labelBytes);
      const [first] = await pdf.embedPdf(src, [0]);
      // Proportions conservées : une étiquette étirée rend ses codes-barres
      // illisibles au scanner.
      const scale = Math.min(
        (LABEL_W - 16) / first.width,
        (boxTop - boxY - 16) / first.height,
      );
      page.drawPage(first, {
        x: MARGIN + (LABEL_W - first.width * scale) / 2,
        y: boxY + (boxTop - boxY - first.height * scale) / 2,
        xScale: scale,
        yScale: scale,
      });
    } catch {
      labelBytes = null;
    }
  }

  if (!labelBytes) {
    const msg = order.tracking_number
      ? 'Etiquette introuvable dans le stockage'
      : 'Aucune etiquette Colissimo';
    page.drawText(win(msg), {
      x: MARGIN + 14,
      y: boxY + (boxTop - boxY) / 2,
      size: 9,
      font,
      color: GREY,
    });
  }

  const bytes = await pdf.save();

  // Archivé pour être réimprimé sans jamais rappeler Colissimo.
  const path = `${orderId}/bon-${Date.now()}.pdf`;
  await admin.storage.from('labels').upload(path, bytes, {
    contentType: 'application/pdf',
    upsert: true,
  });
  const { data: signed } = await admin.storage.from('labels').createSignedUrl(path, 60 * 60 * 24 * 7);

  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }

  return json({
    success: true,
    path,
    signedUrl: signed?.signedUrl ?? null,
    trackingNumber: order.tracking_number ?? null,
    labelGenerated,
    pdfBase64: btoa(binary),
  });
});
