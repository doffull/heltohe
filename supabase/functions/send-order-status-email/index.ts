import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendMail, explainSendFailure } from '../_shared/mailer.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

function trackingUrl(carrier: string, tracking: string): string {
  const c = (carrier || '').toLowerCase();
  const t = encodeURIComponent(tracking);
  if (c.includes('mondial')) return `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${t}`;
  if (c.includes('chronopost')) return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${t}`;
  if (c.includes('dhl')) return `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${t}`;
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${t}`;
  if (c.includes('dpd')) return `https://www.dpd.fr/trace/${t}`;
  return `https://www.laposte.fr/outils/suivre-vos-envois?code=${t}`;
}

function shell(title: string, inner: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:4px;overflow:hidden;">
<tr><td style="background:#111;padding:28px 32px;text-align:center;">
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">HELVETICA-MP</h1>
  <p style="margin:6px 0 0;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Concept Store</p>
</td></tr>
${inner}
<tr><td style="padding:32px;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:12px;color:#aaa;text-align:center;line-height:1.8;">Cet e-mail a été envoyé à <strong>${email}</strong>.</p>
  <p style="margin:12px 0 0;font-size:11px;color:#ccc;text-align:center;letter-spacing:2px;text-transform:uppercase;">HELVETICA-MP Concept Store</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function itemRows(items: OrderItem[]): string {
  return items
    .map(
      (i) => `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111;"><strong>${i.name}</strong>${
        i.size ? `<br><span style="color:#888;font-size:12px;">Taille: ${i.size}</span>` : ''
      }${i.color ? `<span style="color:#888;font-size:12px;"> / ${i.color}</span>` : ''}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px;color:#555;">×${i.quantity}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;font-weight:bold;color:#111;">${(
      Number(i.price) * Number(i.quantity)
    ).toFixed(2)} €</td>
  </tr>`,
    )
    .join('');
}

function paidHtml(o: Record<string, any>): string {
  const items = (o.items || []) as OrderItem[];
  const firstName = String(o.customer_name || '').split(' ')[0] || 'client';
  const inner = `
<tr><td style="padding:36px 32px 0;">
  <h2 style="margin:0 0 8px;font-size:20px;color:#111;">Paiement confirmé ✓</h2>
  <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6;">Bonjour <strong>${firstName}</strong>,<br>Nous avons bien reçu votre paiement. Votre commande est en cours de préparation.</p>
  <p style="margin:0 0 24px;display:inline-block;background:#f5f5f5;padding:10px 16px;border-radius:4px;font-size:13px;color:#555;">N° de commande : <strong style="color:#111;">${o.order_number}</strong></p>
</td></tr>
<tr><td style="padding:0 32px;">
  <h3 style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888;">Récapitulatif</h3>
  <table width="100%" cellpadding="0" cellspacing="0"><tbody>${itemRows(items)}</tbody></table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
    <tr><td style="padding:6px 0;font-size:14px;color:#555;">Sous-total</td><td style="padding:6px 0;text-align:right;font-size:14px;color:#555;">${Number(o.subtotal || 0).toFixed(2)} €</td></tr>
    <tr><td style="padding:6px 0;font-size:14px;color:#555;">Livraison</td><td style="padding:6px 0;text-align:right;font-size:14px;color:#555;">${Number(o.shipping_cost || 0).toFixed(2)} €</td></tr>
    <tr><td style="padding:12px 0 0;font-size:15px;font-weight:700;color:#111;border-top:2px solid #111;">TOTAL TTC</td><td style="padding:12px 0 0;text-align:right;font-size:18px;font-weight:900;color:#111;border-top:2px solid #111;">${Number(o.total || 0).toFixed(2)} €</td></tr>
  </table>
</td></tr>
<tr><td style="padding:28px 32px 0;">
  <h3 style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888;">Livraison</h3>
  <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">${o.customer_name || ''}<br>${o.customer_address || ''}<br>${o.customer_zip || ''} ${
    o.customer_city || ''
  }<br>${o.customer_country || ''}${o.customer_phone ? `<br>Tél : ${o.customer_phone}` : ''}</p>
</td></tr>`;
  return shell(`Paiement confirmé ${o.order_number}`, inner, o.customer_email);
}

function shippedHtml(o: Record<string, any>): string {
  const firstName = String(o.customer_name || '').split(' ')[0] || 'client';
  const carrier = o.shipping_carrier || 'Colissimo';
  const tracking = o.tracking_number as string;
  const url = trackingUrl(carrier, tracking);
  const inner = `
<tr><td style="padding:36px 32px 0;">
  <h2 style="margin:0 0 8px;font-size:20px;color:#111;">Votre commande est expédiée 📦</h2>
  <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6;">Bonjour <strong>${firstName}</strong>,<br>Votre commande <strong>${o.order_number}</strong> vient de quitter notre atelier.</p>
  <div style="background:#f9f9f9;border:1px solid #e5e5e5;border-left:4px solid #111;border-radius:4px;padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      <tr><td style="padding:5px 0;color:#888;">Transporteur</td><td style="padding:5px 0;text-align:right;color:#111;font-weight:700;">${carrier}</td></tr>
      <tr><td style="padding:5px 0;color:#888;">N° de suivi</td><td style="padding:5px 0;text-align:right;color:#111;font-weight:700;font-family:'Courier New',monospace;">${tracking}</td></tr>
    </table>
  </div>
  <p style="margin:24px 0 0;text-align:center;">
    <a href="${url}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:4px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Suivre mon colis</a>
  </p>
  <p style="margin:16px 0 0;font-size:12px;color:#aaa;text-align:center;word-break:break-all;">${url}</p>
</td></tr>`;
  return shell(`Commande ${o.order_number} expédiée`, inner, o.customer_email);
}

const EVENT_TITLES: Record<string, string> = {
  taken_in_charge: 'Votre colis a été pris en charge',
  in_transit: 'Votre colis est en transit',
  out_for_delivery: 'Votre colis est en cours de livraison',
  delivered: 'Votre colis a été livré',
  exception: 'Information sur votre colis',
};

function trackingUpdateHtml(o: Record<string, any>, ev: { status_code: string; label: string; event_at?: string }): string {
  const firstName = String(o.customer_name || '').split(' ')[0] || 'client';
  const carrier = o.shipping_carrier || 'Colissimo';
  const tracking = String(o.tracking_number || '');
  const url = tracking ? trackingUrl(carrier, tracking) : null;
  const title = EVENT_TITLES[ev.status_code] || 'Mise à jour de votre colis';
  const when = ev.event_at
    ? new Date(ev.event_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
    : '';
  const inner = `
<tr><td style="padding:36px 32px 0;">
  <h2 style="margin:0 0 8px;font-size:20px;color:#111;">${title}</h2>
  <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6;">Bonjour <strong>${firstName}</strong>,<br>Nouvelle information sur votre commande <strong>${o.order_number}</strong>.</p>
  <div style="background:#f9f9f9;border:1px solid #e5e5e5;border-left:4px solid #111;border-radius:4px;padding:20px;">
    <p style="margin:0;font-size:15px;color:#111;font-weight:700;">${ev.label}</p>
    ${when ? `<p style="margin:6px 0 0;font-size:12px;color:#888;">${when}</p>` : ''}
    ${tracking ? `<p style="margin:14px 0 0;font-size:13px;color:#888;">Transporteur : <strong style="color:#111;">${carrier}</strong> — Suivi : <strong style="color:#111;font-family:'Courier New',monospace;">${tracking}</strong></p>` : ''}
  </div>
  ${
    url
      ? `<p style="margin:24px 0 0;text-align:center;"><a href="${url}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:4px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Suivre mon colis</a></p>`
      : ''
  }
</td></tr>`;
  return shell(`${title} — ${o.order_number}`, inner, o.customer_email);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!Deno.env.get('SMTP_HOST')) return json({ error: 'Configuration SMTP manquante (SMTP_HOST)' }, 500);

    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.order_id || '').trim();
    const type = String(body?.type || '').trim();
    if (!orderId || !['paid', 'shipped', 'tracking_update'].includes(type)) {
      return json({ error: 'Paramètres invalides (order_id, type: paid|shipped|tracking_update).' }, 400);
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });

    const { data: order, error } = await admin.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (error) return json({ error: error.message }, 400);
    if (!order) return json({ error: 'Commande introuvable' }, 404);
    if (!order.customer_email) return json({ error: 'Commande sans e-mail client' }, 400);
    if (type === 'shipped' && !order.tracking_number) {
      return json({ error: 'Numéro de suivi manquant' }, 400);
    }

    const trackingEvent = {
      status_code: String(body?.event?.status_code || 'in_transit'),
      label: String(body?.event?.label || 'Mise à jour du suivi'),
      event_at: body?.event?.event_at ? String(body.event.event_at) : undefined,
    };

    const subject =
      type === 'paid'
        ? `Paiement confirmé — commande ${order.order_number}`
        : type === 'shipped'
          ? `Votre commande ${order.order_number} est en route`
          : `${EVENT_TITLES[trackingEvent.status_code] || 'Mise à jour de votre colis'} — ${order.order_number}`;
    const html =
      type === 'paid'
        ? paidHtml(order)
        : type === 'shipped'
          ? shippedHtml(order)
          : trackingUpdateHtml(order, trackingEvent);


    const sent = await sendMail({ to: order.customer_email, subject, html });
    if (!sent.ok) {
      const reason = explainSendFailure(sent);
      await admin.from('customer_email_log').insert({
        customer_email: order.customer_email,
        order_id: order.id,
        email_type: type,
        subject,
        status: 'failed',
        error: reason.slice(0, 500),
      });
      // Non bloquant : la commande reste manipulable côté admin, seul l'e-mail échoue.
      return json({ sent: false, warning: reason, status: sent.status, details: sent.error });
    }


    const providerId = sent.id ?? null;

    await admin.from('customer_email_log').insert({
      customer_email: order.customer_email,
      order_id: order.id,
      email_type: type,
      subject,
      status: 'sent',
      provider_id: providerId,
    });

    return json({ sent: true, id: providerId });
  } catch (e) {
    console.error('send-order-status-email error', e);
    return json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, 500);
  }
});
