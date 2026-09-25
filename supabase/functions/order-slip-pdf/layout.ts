// Mise en page du « bon de commande » : une page A4 paysage par commande.
//
//   ┌──────────────────────┬──────────────────────┐
//   │ étiquette Colissimo  │   BON DE COMMANDE    │
//   │ (demi-page gauche    │   (repris de l'e-mail │
//   │  du PDF Colissimo,   │    admin « Nouvelle   │
//   │  taille réelle)      │    commande », clair) │
//   └──────────────────────┴──────────────────────┘
//   + les pages CN23 éventuelles (hors UE / DOM-TOM), à la suite.
//
// Isolé de `index.ts` pour être testable hors Supabase : ce fichier ne dépend
// que de pdf-lib. Pour un aperçu local : copier le fichier en remplaçant
// l'import esm.sh par `pdf-lib`, puis l'exécuter avec `npx tsx` (§33.4).
//
// ⚠️ Depuis le 16/09/2026, Colissimo rend l'étiquette en A4 paysage
// (`PDF_A4_300dpi`, §27.8) : à gauche l'étiquette à coller, à droite la notice
// et la preuve de dépôt. Seule la moitié GAUCHE va sur le colis ; c'est elle,
// et elle seule, que l'on reprend — à l'échelle 1, sinon les codes-barres
// deviennent illisibles au scanner. Avant le 25/09/2026, la page entière était
// réduite à ~40 % dans une colonne de 330 pt.
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1?target=deno';

export const A4 = { w: 841.89, h: 595.28 };
const HALF = A4.w / 2;
const MARGIN = 30;
const RIGHT_X = HALF + 28;
const RIGHT_EDGE = A4.w - MARGIN;

// Palette : celle de l'e-mail admin, inversée en clair pour l'impression.
const INK = rgb(0.07, 0.07, 0.07); // #111
const GREY = rgb(0.45, 0.45, 0.45); // #737373
const MUTED = rgb(0.53, 0.53, 0.53); // #888
const RULE = rgb(0.85, 0.85, 0.85);
const PANEL = rgb(0.97, 0.97, 0.97);
const GREEN = rgb(0.086, 0.639, 0.29); // #16a34a — le vert du TOTAL

export interface SlipOrder {
  order_number?: string | null;
  created_at?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_zip?: string | null;
  customer_city?: string | null;
  customer_country?: string | null;
  tracking_number?: string | null;
  items?: unknown;
  subtotal?: number | string | null;
  shipping_cost?: number | string | null;
  total?: number | string | null;
}

/**
 * Les polices standard de pdf-lib encodent en WinAnsi : les accents et « € »
 * passent, mais le tiret cadratin et l'apostrophe courbe — fréquents dans les
 * adresses saisies au téléphone — lèvent une exception à l'écriture. On les
 * rabat sur leurs équivalents ASCII plutôt que d'embarquer une police.
 */
export function win(text: unknown): string {
  return String(text ?? '')
    .replace(/[—–]/g, '-')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, '...')
    .replace(/[  ]/g, ' ')
    .replace(/×/g, 'x')
    // Tout ce qui sort du latin-1 (sauf €) est écarté : mieux vaut un
    // caractère manquant qu'un PDF qui n'est jamais produit.
    .replace(/[^\x20-\xFF\n€]/g, '');
}

const money = (n: unknown) => `${Number(n || 0).toFixed(2)} €`;

/** Même libellé que l'e-mail, déduit de la commande (le mode n'est pas stocké). */
function deliveryLabel(order: SlipOrder): string {
  const country = String(order.customer_country || 'FR').trim().toUpperCase();
  if (!['FR', 'FRANCE', ''].includes(country)) return 'Colissimo International';
  return /^point relais/i.test(String(order.customer_address || '').trim())
    ? 'Colissimo Point Relais'
    : 'Colissimo Domicile';
}

/** Coupe sur les espaces pour tenir dans `width` points. */
function wrap(s: string, font: PDFFont, size: number, width: number): string[] {
  const words = win(s).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Tronque avec « ... » pour tenir dans `width` points. */
function fit(s: string, font: PDFFont, size: number, width: number): string {
  let str = win(s);
  if (font.widthOfTextAtSize(str, size) <= width) return str;
  while (str.length > 1 && font.widthOfTextAtSize(`${str}...`, size) > width) str = str.slice(0, -1);
  return `${str}...`;
}

async function drawLabel(pdf: PDFDocument, page: PDFPage, font: PDFFont, labelBytes: Uint8Array | null, missingMsg: string) {
  if (labelBytes) {
    try {
      const src = await PDFDocument.load(labelBytes);
      const first = src.getPage(0);
      const { width: w, height: h } = first.getSize();
      if (w > h) {
        // A4 paysage : on ne garde que la moitié gauche, l'étiquette à coller.
        const embedded = await pdf.embedPage(first, { left: 0, bottom: 0, right: w / 2, top: h });
        const scale = Math.min(HALF / (w / 2), A4.h / h, 1);
        page.drawPage(embedded, {
          x: (HALF - (w / 2) * scale) / 2,
          y: (A4.h - h * scale) / 2,
          xScale: scale,
          yScale: scale,
        });
      } else {
        // Ancien format 10x15 (portrait) : la page entière est l'étiquette.
        const embedded = await pdf.embedPage(first);
        const scale = Math.min((HALF - 2 * MARGIN) / w, (A4.h - 2 * MARGIN) / h, 1);
        page.drawPage(embedded, {
          x: (HALF - w * scale) / 2,
          y: (A4.h - h * scale) / 2,
          xScale: scale,
          yScale: scale,
        });
      }
      // Pages suivantes (CN23 hors UE / DOM-TOM) : recopiées telles quelles,
      // derrière la page de la commande. Sans elles, le colis part sans ses
      // papiers de douane.
      const extra = src.getPageIndices().slice(1);
      if (extra.length) {
        for (const p of await pdf.copyPages(src, extra)) pdf.addPage(p);
      }
      return true;
    } catch {
      // PDF illisible : on retombe sur le cadre vide ci-dessous.
    }
  }
  page.drawRectangle({
    x: MARGIN,
    y: MARGIN,
    width: HALF - 2 * MARGIN,
    height: A4.h - 2 * MARGIN,
    borderColor: RULE,
    borderWidth: 0.8,
    borderDashArray: [4, 3],
  });
  const msg = win(missingMsg);
  page.drawText(msg, {
    x: (HALF - font.widthOfTextAtSize(msg, 10)) / 2,
    y: A4.h / 2,
    size: 10,
    font,
    color: GREY,
  });
  return false;
}

/**
 * Ajoute à `pdf` la page de la commande (+ ses CN23). Renvoie `true` si
 * l'étiquette a pu être posée.
 */
export async function renderOrderSlip(
  pdf: PDFDocument,
  order: SlipOrder,
  labelBytes: Uint8Array | null,
): Promise<boolean> {
  const page = pdf.addPage([A4.w, A4.h]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const colW = RIGHT_EDGE - RIGHT_X;

  // ── Colonne de gauche : l'étiquette (les CN23 sont ajoutées après) ──
  const labelOk = await drawLabel(
    pdf,
    page,
    font,
    labelBytes,
    order.tracking_number ? 'Étiquette introuvable dans le stockage' : 'Aucune étiquette Colissimo',
  );

  let y = A4.h - MARGIN;
  const text = (s: unknown, x: number, size: number, opts: { bold?: boolean; color?: ReturnType<typeof rgb> } = {}) =>
    page.drawText(win(s), { x, y, size, font: opts.bold ? bold : font, color: opts.color ?? INK });
  const right = (s: unknown, edge: number, size: number, opts: { bold?: boolean; color?: ReturnType<typeof rgb> } = {}) => {
    const str = win(s);
    const f = opts.bold ? bold : font;
    page.drawText(str, { x: edge - f.widthOfTextAtSize(str, size), y, size, font: f, color: opts.color ?? INK });
  };
  const rule = (yy: number, color = RULE, thickness = 0.6) =>
    page.drawLine({ start: { x: RIGHT_X, y: yy }, end: { x: RIGHT_EDGE, y: yy }, thickness, color });
  const heading = (s: string) => {
    text(s, RIGHT_X, 8, { bold: true, color: MUTED });
    y -= 13;
  };

  // En-tête : la marque, comme dans l'e-mail — sans le bandeau noir.
  const bandH = 46;
  page.drawRectangle({ x: RIGHT_X, y: y - bandH, width: colW, height: bandH, color: PANEL });
  y -= 22;
  const brand = 'H E L V E T I C A - M P';
  text(brand, RIGHT_X + (colW - bold.widthOfTextAtSize(brand, 14)) / 2, 14, { bold: true });
  y -= 14;
  const sub = 'BON DE COMMANDE';
  text(sub, RIGHT_X + (colW - font.widthOfTextAtSize(sub, 8)) / 2, 8, { color: MUTED });
  y -= 10 + 16;

  // Bloc d'informations : les quatre lignes de l'e-mail, plus date et téléphone.
  const created = order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : '';
  const rows: [string, string, boolean][] = [
    ['N° de commande', String(order.order_number || ''), true],
    ['Date', created, false],
    ['Client', String(order.customer_name || ''), true],
    ['Email', String(order.customer_email || ''), false],
    ['Téléphone', String(order.customer_phone || ''), false],
    ['Livraison', deliveryLabel(order), false],
  ];
  const visible = rows.filter(([, v]) => v.trim());
  const panelH = visible.length * 15 + 12;
  page.drawRectangle({ x: RIGHT_X, y: y - panelH + 10, width: colW, height: panelH, color: PANEL, borderColor: RULE, borderWidth: 0.5 });
  y -= 4;
  for (const [label, value, strong] of visible) {
    text(label, RIGHT_X + 10, 9, { color: GREY });
    right(fit(value, strong ? bold : font, 9, colW - 110), RIGHT_EDGE - 10, 9, { bold: strong });
    y -= 15;
  }
  y -= 12;

  // Adresse de livraison.
  heading('ADRESSE DE LIVRAISON');
  const addr = [
    order.customer_address,
    `${order.customer_zip || ''} ${order.customer_city || ''}`.trim(),
    order.customer_country,
  ].filter((l) => String(l || '').trim());
  for (const line of addr) {
    for (const chunk of wrap(String(line), font, 9, colW)) {
      text(chunk, RIGHT_X, 9);
      y -= 11;
    }
  }
  if (order.tracking_number) {
    y -= 2;
    text(`Suivi Colissimo : ${order.tracking_number}`, RIGHT_X, 9, { bold: true });
    y -= 11;
  }
  y -= 10;

  // Articles — mêmes informations que l'e-mail, sans les photos.
  heading('ARTICLES');
  rule(y + 8);
  y -= 6;
  const items = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];
  const COL_QTY = RIGHT_EDGE - 70;
  const nameW = COL_QTY - RIGHT_X - 30;
  const FOOTER = MARGIN + 70; // place réservée aux totaux
  let overflow = 0;
  for (let i = 0; i < items.length; i++) {
    if (y - 24 < FOOTER + 14) {
      overflow = items.length - i;
      break;
    }
    const item = items[i];
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    text(fit(String(item.name || item.productId || ''), bold, 9.5, nameW), RIGHT_X, 9.5, { bold: true });
    right(`x${qty}`, COL_QTY, 9.5, { color: GREY });
    right(money(price * qty), RIGHT_EDGE, 9.5, { bold: true });
    y -= 11;
    const details = [
      item.size ? `Taille: ${item.size}` : '',
      item.color ? `Couleur: ${item.color}` : '',
      `Prix unitaire: ${money(price)}`,
    ].filter(Boolean).join(' / ');
    text(fit(details, font, 8, nameW), RIGHT_X, 8, { color: MUTED });
    y -= 8;
    rule(y);
    y -= 12;
  }
  if (overflow > 0) {
    text(`... et ${overflow} article(s) supplémentaire(s)`, RIGHT_X, 8, { color: GREY });
    y -= 14;
  }

  // Totaux — au pied de la colonne, comme dans l'e-mail.
  y = Math.min(y - 8, FOOTER);
  const shipping = Number(order.shipping_cost || 0);
  text('Sous-total', RIGHT_X, 9.5, { color: GREY });
  right(money(order.subtotal), RIGHT_EDGE, 9.5, { color: GREY });
  y -= 14;
  text('Livraison', RIGHT_X, 9.5, { color: GREY });
  right(shipping === 0 ? 'GRATUIT' : money(shipping), RIGHT_EDGE, 9.5, { color: GREY });
  y -= 10;
  rule(y, INK, 0.8);
  y -= 18;
  text('TOTAL', RIGHT_X, 12, { bold: true });
  right(money(order.total), RIGHT_EDGE, 15, { bold: true, color: GREEN });

  return labelOk;
}
