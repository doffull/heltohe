import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COLISSIMO_REST = 'https://ws.colissimo.fr/sls-ws/SlsServiceWSRest/2.0/generateLabel';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Extract the raw PDF bytes out of a multipart/related Colissimo response. */
function extractPdf(bytes: Uint8Array): Uint8Array | null {
  const marker = new TextEncoder().encode('%PDF');
  let start = -1;
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === marker[0] && bytes[i + 1] === marker[1] && bytes[i + 2] === marker[2] && bytes[i + 3] === marker[3]) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  // Find last %%EOF
  const eof = new TextEncoder().encode('%%EOF');
  let end = bytes.length;
  for (let i = bytes.length - eof.length; i > start; i--) {
    let ok = true;
    for (let j = 0; j < eof.length; j++) if (bytes[i + j] !== eof[j]) { ok = false; break; }
    if (ok) { end = i + eof.length; break; }
  }
  return bytes.slice(start, end);
}

function extractJsonPart(bytes: Uint8Array): Record<string, unknown> | null {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(bytes.length, 20000)));
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

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

  const login = Deno.env.get('COLISSIMO_LOGIN');
  const password = Deno.env.get('COLISSIMO_PASSWORD');
  if (!login || !password) return json({ error: 'Colissimo credentials not configured' }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const orderId = typeof body.order_id === 'string' ? body.order_id : '';
  if (!orderId) return json({ error: 'order_id is required' }, 400);
  const isReturn = body.is_return === true;

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

  // Poids total : somme des poids réels des produits (défaut 1500 g par article), minimum 0,2 kg.
  const items = Array.isArray(order.items) ? (order.items as Array<Record<string, unknown>>) : [];
  const DEFAULT_WEIGHT_G = 1500;
  let weight = Number(body.weight) || 0;
  if (!weight) {
    const ids = Array.from(
      new Set(
        items
          .map((it) => String(it.productId ?? it.product_id ?? ''))
          .filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
      ),
    );
    const weights: Record<string, number> = {};
    if (ids.length) {
      const { data: prods } = await admin.from('products').select('id, weight_grams').in('id', ids);
      for (const p of prods || []) {
        weights[String(p.id)] = Number(p.weight_grams) > 0 ? Number(p.weight_grams) : DEFAULT_WEIGHT_G;
      }
    }
    const totalGrams = items.reduce((sum, it) => {
      const qty = Number(it.quantity) || 1;
      const pid = String(it.productId ?? it.product_id ?? '');
      return sum + qty * (weights[pid] || DEFAULT_WEIGHT_G);
    }, 0);
    weight = totalGrams / 1000;
  }
  weight = Math.max(0.2, Math.round(weight * 1000) / 1000);


  const nameParts = String(order.customer_name || 'Client').trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.slice(-1)[0] : String(order.customer_name || 'Client');
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '.';
  const isRelay = String(order.customer_address || '').toLowerCase().includes('point relais');
  const productCode = isReturn ? 'REPA' : isRelay ? 'A2P' : 'DOM';

  const senderName = (body.sender_name as string) || 'HELVETICA-MP Concept Store';
  const senderAddress = (body.sender_address as string) || '1 Rue de la Paix';
  const senderZip = (body.sender_zip as string) || '75001';
  const senderCity = (body.sender_city as string) || 'Paris';

  const payload = {
    contractNumber: login,
    password,
    outputFormat: {
      x: 0,
      y: 0,
      outputPrintingType: 'PDF_10x15_300dpi',
    },
    letter: {
      service: {
        productCode,
        depositDate: new Date().toISOString().split('T')[0],
        orderNumber: String(order.order_number || ''),
        totalAmount: Math.round(Number(order.total || 0) * 100),
      },
      parcel: { weight },
      sender: {
        address: {
          companyName: senderName,
          line2: senderAddress,
          countryCode: 'FR',
          city: senderCity,
          zipCode: senderZip,
        },
      },
      addressee: {
        address: {
          lastName,
          firstName,
          line2: String(order.customer_address || ''),
          countryCode: 'FR',
          city: String(order.customer_city || ''),
          zipCode: String(order.customer_zip || ''),
          phoneNumber: String(order.customer_phone || ''),
          mobileNumber: String(order.customer_phone || ''),
          email: String(order.customer_email || ''),
        },
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(COLISSIMO_REST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'multipart/related, application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return json({ error: 'Colissimo unreachable', details: String(e) }, 502);
  }

  const raw = new Uint8Array(await response.arrayBuffer());
  const meta = extractJsonPart(raw);
  const messages = (meta?.messages as Array<Record<string, unknown>>) || [];
  const blocking = messages.filter((m) => String(m.type || '').toUpperCase() === 'ERROR');
  if (!response.ok || blocking.length > 0) {
    return json(
      {
        error: 'Colissimo error',
        details: blocking.map((m) => `${m.id ?? ''} ${m.messageContent ?? ''}`).join(' | ') ||
          `HTTP ${response.status}`,
      },
      422,
    );
  }

  const pdf = extractPdf(raw);
  if (!pdf) return json({ error: 'Aucun PDF retourné par Colissimo' }, 502);

  const labelResponse = (meta?.labelResponse as Record<string, unknown>) || {};
  const trackingNumber = String(labelResponse.parcelNumber || '') || null;

  const path = `${orderId}/${isReturn ? 'retour' : 'aller'}-${Date.now()}.pdf`;
  const { error: uploadError } = await admin.storage.from('labels').upload(path, pdf, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (uploadError) return json({ error: `Upload échoué: ${uploadError.message}` }, 500);

  const { data: signed } = await admin.storage.from('labels').createSignedUrl(path, 60 * 60 * 24 * 7);

  if (!isReturn) {
    const update: Record<string, unknown> = {
      label_path: path,
      label_url: signed?.signedUrl ?? null,
      label_generated_at: new Date().toISOString(),
      shipping_carrier: 'Colissimo',
    };
    if (trackingNumber) update.tracking_number = trackingNumber;
    await admin.from('orders').update(update).eq('id', orderId);
  }

  // Base64 (chunked pour éviter le débordement de pile)
  let binary = '';
  for (let i = 0; i < pdf.length; i += 8192) {
    binary += String.fromCharCode(...pdf.subarray(i, i + 8192));
  }

  return json({
    success: true,
    trackingNumber,
    productCode,
    weight,
    path,
    signedUrl: signed?.signedUrl ?? null,
    pdfBase64: btoa(binary),
  });
});
