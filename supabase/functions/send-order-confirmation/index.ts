import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

interface EmailPayload {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  deliveryMode: 'home' | 'relay';
  adminEmail?: string;
  emailType?: 'order_confirmation' | 'payment_confirmation' | 'resend_confirmation';
}

function buildEmailHtml(payload: EmailPayload): string {
  const { orderNumber, customerName, customerEmail, items, subtotal, shippingCost, total, deliveryMode } = payload;
  const firstName = customerName.split(' ')[0];

  const itemsRows = items.map(item => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #111;">
        <strong>${item.name}</strong>
        ${item.size ? `<br><span style="color: #888; font-size: 12px;">Taille: ${item.size}</span>` : ''}
        ${item.color ? `<span style="color: #888; font-size: 12px;"> / ${item.color}</span>` : ''}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px; color: #555;">
        ×${item.quantity}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: bold; color: #111;">
        ${(item.price * item.quantity).toFixed(2)} €
      </td>
    </tr>
  `).join('');

  const deliveryLabel = deliveryMode === 'relay' ? 'Colissimo Point Relais (3–5 jours)' : 'Colissimo Domicile (2–3 jours)';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de commande ${orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: #111111; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase;">LVTK6</h1>
              <p style="margin: 6px 0 0; color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Concept Store</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 0;">
              <h2 style="margin: 0 0 8px; font-size: 20px; color: #111; font-weight: 700;">Commande confirmée ✓</h2>
              <p style="margin: 0 0 24px; color: #555; font-size: 15px; line-height: 1.6;">
                Bonjour <strong>${firstName}</strong>,<br>
                Merci pour votre commande ! Nous l'avons bien reçue et elle est en attente de paiement.
              </p>
              <p style="margin: 0 0 32px; display: inline-block; background-color: #f5f5f5; padding: 10px 16px; border-radius: 4px; font-size: 13px; color: #555;">
                N° de commande : <strong style="color: #111;">${orderNumber}</strong>
              </p>
            </td>
          </tr>

          <!-- Order items -->
          <tr>
            <td style="padding: 0 40px;">
              <h3 style="margin: 0 0 16px; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #888;">Articles commandés</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="text-align: left; font-size: 11px; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 8px; border-bottom: 2px solid #111;">Article</th>
                    <th style="text-align: center; font-size: 11px; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 8px; border-bottom: 2px solid #111;">Qté</th>
                    <th style="text-align: right; font-size: 11px; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 8px; border-bottom: 2px solid #111;">Prix</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #555;">Sous-total</td>
                  <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #555;">${subtotal.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #555;">${deliveryLabel}</td>
                  <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #555;">
                    ${shippingCost === 0 ? '<span style="color: #22c55e; font-weight: 600;">GRATUIT</span>' : `${shippingCost.toFixed(2)} €`}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 0; font-size: 16px; font-weight: 700; color: #111; border-top: 2px solid #111; margin-top: 8px;">TOTAL TTC</td>
                  <td style="padding: 12px 0 0; text-align: right; font-size: 18px; font-weight: 900; color: #111; border-top: 2px solid #111;">${total.toFixed(2)} €</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payment instructions -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <div style="background-color: #f9f9f9; border: 1px solid #e5e5e5; border-left: 4px solid #111; border-radius: 4px; padding: 24px;">
                <h3 style="margin: 0 0 16px; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #111;">Instructions de paiement</h3>
                <p style="margin: 0 0 16px; font-size: 14px; color: #555; line-height: 1.6;">
                  Veuillez effectuer un <strong>virement bancaire</strong> en indiquant la référence ci-dessous. Votre commande sera expédiée dès réception du paiement.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Courier New', monospace; font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #888;">Bénéficiaire :</td>
                    <td style="padding: 6px 0; text-align: right; color: #111; font-weight: 600;">LVTK6 Concept</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #888;">Montant :</td>
                    <td style="padding: 6px 0; text-align: right; color: #111; font-weight: 700; font-size: 15px;">${total.toFixed(2)} €</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #888;">Référence :</td>
                    <td style="padding: 6px 0; text-align: right; color: #111; font-weight: 700;">${orderNumber}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Delivery info -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 16px; font-size: 14px; color: #15803d;">
                📦 Expédition <strong>${deliveryLabel}</strong> dès validation de votre paiement.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px; border-top: 1px solid #f0f0f0; margin-top: 32px;">
              <p style="margin: 0; font-size: 12px; color: #aaa; text-align: center; line-height: 1.8;">
                Une question ? Contactez-nous par email ou via le chat sur notre site.<br>
                Cet email a été envoyé à <strong>${customerEmail}</strong>.
              </p>
              <p style="margin: 16px 0 0; font-size: 11px; color: #ccc; text-align: center; letter-spacing: 2px; text-transform: uppercase;">
                LVTK6 Concept Store
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function buildPaymentConfirmationHtml(payload: EmailPayload): string {
  const { orderNumber, customerName, customerEmail, items, subtotal, shippingCost, total, deliveryMode } = payload;
  const firstName = customerName.split(' ')[0];
  const deliveryLabel = deliveryMode === 'relay' ? 'Colissimo Point Relais (3–5 jours)' : 'Colissimo Domicile (2–3 jours)';

  const itemsRows = items.map(item => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #111;">
        <strong>${item.name}</strong>
        ${item.size ? `<br><span style="color: #888; font-size: 12px;">Taille: ${item.size}</span>` : ''}
        ${item.color ? `<span style="color: #888; font-size: 12px;"> / ${item.color}</span>` : ''}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px; color: #555;">×${item.quantity}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: bold; color: #111;">
        ${(item.price * item.quantity).toFixed(2)} €
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement reçu — ${orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: #111111; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase;">LVTK6</h1>
              <p style="margin: 6px 0 0; color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Concept Store</p>
            </td>
          </tr>

          <!-- Payment confirmed banner -->
          <tr>
            <td style="background-color: #f0fdf4; border-bottom: 2px solid #22c55e; padding: 20px 40px; text-align: center;">
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #15803d;">✅ Paiement reçu et confirmé</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 0;">
              <h2 style="margin: 0 0 8px; font-size: 20px; color: #111; font-weight: 700;">Votre paiement a été reçu !</h2>
              <p style="margin: 0 0 24px; color: #555; font-size: 15px; line-height: 1.6;">
                Bonjour <strong>${firstName}</strong>,<br>
                Nous avons bien reçu votre paiement pour la commande <strong>${orderNumber}</strong>. Votre commande est maintenant en cours de préparation et sera expédiée très prochainement.
              </p>
              <p style="margin: 0 0 32px; display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 16px; border-radius: 4px; font-size: 13px; color: #15803d; font-weight: 600;">
                Commande ${orderNumber} — Payée ✓
              </p>
            </td>
          </tr>

          <!-- Order items -->
          <tr>
            <td style="padding: 0 40px;">
              <h3 style="margin: 0 0 16px; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #888;">Récapitulatif</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tbody>${itemsRows}</tbody>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #555;">Sous-total</td>
                  <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #555;">${subtotal.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #555;">Livraison (${deliveryLabel})</td>
                  <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #555;">
                    ${shippingCost === 0 ? '<span style="color: #22c55e; font-weight: 600;">GRATUIT</span>' : `${shippingCost.toFixed(2)} €`}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 0; font-size: 16px; font-weight: 700; color: #111; border-top: 2px solid #111;">TOTAL PAYÉ</td>
                  <td style="padding: 12px 0 0; text-align: right; font-size: 18px; font-weight: 900; color: #22c55e; border-top: 2px solid #111;">${total.toFixed(2)} €</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping info -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 16px; font-size: 14px; color: #1d4ed8;">
                🚚 Votre commande sera expédiée en <strong>${deliveryLabel}</strong>. Vous recevrez un email avec votre numéro de suivi dès l'expédition.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px; border-top: 1px solid #f0f0f0; margin-top: 32px;">
              <p style="margin: 0; font-size: 12px; color: #aaa; text-align: center; line-height: 1.8;">
                Une question ? Contactez-nous par email ou via le chat sur notre site.<br>
                Cet email a été envoyé à <strong>${customerEmail}</strong>.
              </p>
              <p style="margin: 16px 0 0; font-size: 11px; color: #ccc; text-align: center; letter-spacing: 2px; text-transform: uppercase;">
                LVTK6 Concept Store
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function buildAdminEmailHtml(payload: EmailPayload): string {
  const { orderNumber, customerName, customerEmail, items, subtotal, shippingCost, total, deliveryMode } = payload;
  const deliveryLabel = deliveryMode === 'relay' ? 'Colissimo Point Relais (3–5 jours)' : 'Colissimo Domicile (2–3 jours)';
  const adminUrl = `https://lvatk6000art.lovable.app/admin/commandes`;

  const itemsRows = items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #222; font-size: 13px; color: #eee;">
        <strong>${item.name}</strong>
        ${item.size ? `<br><span style="color: #888; font-size: 11px;">Taille: ${item.size}</span>` : ''}
        ${item.color ? `<span style="color: #888; font-size: 11px;"> / ${item.color}</span>` : ''}
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #222; text-align: center; font-size: 13px; color: #aaa;">×${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #222; text-align: right; font-size: 13px; font-weight: bold; color: #eee;">${(item.price * item.quantity).toFixed(2)} €</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle commande ${orderNumber}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border:1px solid #222;border-radius:4px;overflow:hidden;">

          <!-- Alert header -->
          <tr>
            <td style="background:#dc2626;padding:16px 32px;text-align:center;">
              <p style="margin:0;color:#fff;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;">🛍️ NOUVELLE COMMANDE REÇUE</p>
            </td>
          </tr>

          <!-- Brand -->
          <tr>
            <td style="background:#111;padding:24px 32px 16px;text-align:center;border-bottom:1px solid #222;">
              <h1 style="margin:0;color:#fff;font-size:20px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">LVTK6</h1>
              <p style="margin:4px 0 0;color:#555;font-size:10px;letter-spacing:2px;text-transform:uppercase;">Admin Notification</p>
            </td>
          </tr>

          <!-- Order info -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:4px;padding:16px;">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;">N° de commande</td>
                  <td style="padding:6px 0;text-align:right;font-size:13px;font-weight:700;color:#fff;font-family:'Courier New',monospace;">${orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;">Client</td>
                  <td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:#fff;">${customerName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;">Email</td>
                  <td style="padding:6px 0;text-align:right;font-size:13px;color:#60a5fa;">${customerEmail}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#888;">Livraison</td>
                  <td style="padding:6px 0;text-align:right;font-size:13px;color:#fff;">${deliveryLabel}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Articles -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#555;">Articles</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tbody>${itemsRows}</tbody>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:#777;">Sous-total</td>
                  <td style="padding:5px 0;text-align:right;font-size:13px;color:#aaa;">${subtotal.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:#777;">Livraison</td>
                  <td style="padding:5px 0;text-align:right;font-size:13px;color:#aaa;">${shippingCost === 0 ? 'GRATUIT' : `${shippingCost.toFixed(2)} €`}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;font-size:15px;font-weight:700;color:#fff;border-top:1px solid #333;">TOTAL</td>
                  <td style="padding:12px 0 0;text-align:right;font-size:18px;font-weight:900;color:#22c55e;border-top:1px solid #333;">${total.toFixed(2)} €</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${adminUrl}" style="display:inline-block;background:#fff;color:#000;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:2px;">
                      → Voir la commande dans l'admin
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:11px;color:#444;text-align:center;letter-spacing:1px;">LVTK6 Concept Store — Notification automatique</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check — reject requests with no Supabase credentials at all.
  // We accept:
  //   1. Authenticated users (Bearer JWT from supabase.functions.invoke with a logged-in session)
  //   2. Anon/guest users (apikey header sent automatically by the Supabase JS SDK)
  // We reject: raw unauthenticated HTTP requests (no Authorization header AND no apikey).
  const authHeader = req.headers.get('Authorization');
  const apiKeyHeader = req.headers.get('apikey');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  if (!authHeader && !apiKeyHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // If Bearer token present, validate it belongs to a real user session
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    // Only validate as user JWT if it's not just the anon key being passed as Bearer
    if (token !== supabaseAnonKey) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        supabaseAnonKey,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const payload: EmailPayload = await req.json();
    const { customerEmail, customerName, orderNumber, adminEmail, emailType = 'order_confirmation' } = payload;

    if (!customerEmail || !orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customerEmail, orderNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let html: string;
    let subject: string;

    if (emailType === 'payment_confirmation') {
      html = buildPaymentConfirmationHtml(payload);
      subject = `✅ Paiement reçu — Commande ${orderNumber} — LVTK6`;
    } else {
      // order_confirmation or resend_confirmation
      html = buildEmailHtml(payload);
      subject = emailType === 'resend_confirmation'
        ? `[Renvoi] Confirmation de commande ${orderNumber} — LVTK6`
        : `Confirmation de commande ${orderNumber} — LVTK6`;
    }

    // Send customer email
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LVTK6 Concept <onboarding@resend.dev>',
        to: [customerEmail],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({ error: 'EMAIL_SEND_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send admin notification email if configured (only for new orders)
    if (adminEmail && emailType === 'order_confirmation') {
      const adminHtml = buildAdminEmailHtml(payload);
      const adminRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'LVTK6 Boutique <onboarding@resend.dev>',
          to: [adminEmail],
          subject: `🛍️ Nouvelle commande ${orderNumber} — ${customerName}`,
          html: adminHtml,
        }),
      });
      if (!adminRes.ok) {
        const adminErr = await adminRes.json();
        console.error('Admin notification email error:', adminErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
