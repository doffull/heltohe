import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const COLISSIMO_RELAY_API = 'https://ws.colissimo.fr/pointretrait-ws-cxf/PointRetraitServiceWS/2.0';
const COLISSIMO_LABEL_API = 'https://ws.colissimo.fr/sls-ws/SlsServiceWS/2.0';
const RELAY_NS = 'http://v2.pointretrait.geopost.com/';

/**
 * Vrai si le jeton est une clé publique de CE projet Supabase (clé anon héritée ou
 * clé `sb_publishable_…`). C'est ce que le navigateur envoie quand l'utilisateur
 * n'est pas connecté.
 *
 * On compare d'abord à la variable injectée par la plateforme. Si elle ne
 * correspond pas — les projets migrés vers les nouvelles clés n'exposent pas
 * forcément la même valeur que celle utilisée par le front — on demande à
 * l'API Auth du projet de trancher : elle n'accepte que ses propres clés.
 */
async function isProjectPublicKey(token: string): Promise<boolean> {
  if (!token) return false;

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (anonKey && token === anonKey) return true;

  // Tout le reste (jeton de session JWT `eyJ…`, jeton invalide) est laissé à
  // `getClaims` : inutile d'un aller-retour réseau pour ces cas-là.
  if (!token.startsWith('sb_publishable_')) return false;

  try {
    // `/auth/v1/settings` accepte les clés publiques et renvoie 401 pour toute clé
    // étrangère au projet. (`/rest/v1/` ne convient pas : il exige une clé secrète.)
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/settings`, {
      headers: { apikey: token },
    });
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const unauthorized = () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  // Actions ouvertes aux visiteurs non connectés. `getRelayPoints` est la recherche
  // de points relais du checkout, qui est accessible sans compte : exiger une session
  // ici renvoyait un 401 à tous les invités.
  const PUBLIC_ACTIONS = ['getRelayPoints'];

  // Le corps est lu AVANT l'authentification : c'est lui qui porte l'action, donc ce
  // qui détermine le niveau d'accès exigé.
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const action = body?.action as string | undefined;
  const isPublicAction = !!action && PUBLIC_ACTIONS.includes(action);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized();
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '').trim();

  // Une clé publique de projet (anon ou `sb_publishable_…`) n'est PAS un jeton de
  // session : `getClaims` la rejette, quel que soit son format. On la reconnaît donc
  // séparément, pour n'autoriser que les actions publiques.
  const isProjectKey = await isProjectPublicKey(token);

  let claims: Record<string, any> | null = null;
  if (!isProjectKey) {
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return unauthorized();
    }
    claims = claimsData.claims;
  }

  // Hors actions publiques, une clé de projet ne suffit pas : il faut une vraie session.
  if (!isPublicAction && !claims) {
    return unauthorized();
  }

  const COLISSIMO_LOGIN = Deno.env.get('COLISSIMO_LOGIN');
  const COLISSIMO_PASSWORD = Deno.env.get('COLISSIMO_PASSWORD');

  if (!COLISSIMO_LOGIN || !COLISSIMO_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Colissimo credentials not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Admin role required for everything except the public relay-point lookup used by checkout.
    if (!isPublicAction) {
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: claims!.sub,
        _role: 'admin',
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ─── ACTION: TEST CONNECTION ──────────────────────────────────────────────
    if (action === 'testConnection') {
      const now = new Date();
      const shippingDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${RELAY_NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:findRDVPointRetraitAcheminement>
      <accountNumber>${escapeXml(COLISSIMO_LOGIN)}</accountNumber>
      <password>${escapeXml(COLISSIMO_PASSWORD)}</password>
      <address></address>
      <zipCode>75001</zipCode>
      <city>Paris</city>
      <countryCode>FR</countryCode>
      <weight>1</weight>
      <shippingDate>${shippingDate}</shippingDate>
      <filterRelay>0</filterRelay>
      <requestId></requestId>
      <lang>FR</lang>
      <optionInter>1</optionInter>
    </tns:findRDVPointRetraitAcheminement>
  </soapenv:Body>
</soapenv:Envelope>`;

      const response = await fetch(COLISSIMO_RELAY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'SOAPAction': '' },
        body: soapBody,
      });

      const xmlText = await response.text();
      if (!response.ok || xmlText.includes('<faultcode>')) {
        const faultMatch = xmlText.match(/<faultstring>([^<]+)<\/faultstring>/);
        return new Response(JSON.stringify({ success: false, error: faultMatch?.[1] || 'Connection failed' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorCodeMatch = xmlText.match(/<errorCode>([^<]+)<\/errorCode>/);
      const errorCode = errorCodeMatch ? parseInt(errorCodeMatch[1]) : 0;
      if (errorCode !== 0) {
        const errorMsgMatch = xmlText.match(/<errorMessage>([^<]+)<\/errorMessage>/);
        return new Response(JSON.stringify({ success: false, error: `Code ${errorCode}: ${errorMsgMatch?.[1] || ''}` }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── ACTION: GET RELAY POINTS ─────────────────────────────────────────────
    if (action === 'getRelayPoints') {
      const { zipCode, city = '-', countryCode = 'FR' } = body;
      const safeCity = city.trim() || '-';

      if (!zipCode) {
        return new Response(JSON.stringify({ error: 'zipCode is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const now = new Date();
      const shippingDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${RELAY_NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:findRDVPointRetraitAcheminement>
      <accountNumber>${escapeXml(COLISSIMO_LOGIN)}</accountNumber>
      <password>${escapeXml(COLISSIMO_PASSWORD)}</password>
      <address></address>
      <zipCode>${escapeXml(zipCode)}</zipCode>
      <city>${escapeXml(safeCity)}</city>
      <countryCode>${escapeXml(countryCode)}</countryCode>
      <weight>1</weight>
      <shippingDate>${shippingDate}</shippingDate>
      <filterRelay>0</filterRelay>
      <requestId></requestId>
      <lang>FR</lang>
      <optionInter>1</optionInter>
    </tns:findRDVPointRetraitAcheminement>
  </soapenv:Body>
</soapenv:Envelope>`;

      const response = await fetch(COLISSIMO_RELAY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'SOAPAction': '' },
        body: soapBody,
      });

      const xmlText = await response.text();
      if (!response.ok || xmlText.includes('<faultcode>')) {
        const faultMatch = xmlText.match(/<faultstring>([^<]+)<\/faultstring>/);
        const fault = faultMatch ? faultMatch[1] : xmlText.slice(0, 300);
        return new Response(JSON.stringify({ error: 'Colissimo SOAP fault', details: fault }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const errorCodeMatch = xmlText.match(/<errorCode>([^<]+)<\/errorCode>/);
      const errorCode = errorCodeMatch ? parseInt(errorCodeMatch[1]) : 0;
      if (errorCode !== 0) {
        const errorMsgMatch = xmlText.match(/<errorMessage>([^<]+)<\/errorMessage>/);
        return new Response(JSON.stringify({ error: `Colissimo error ${errorCode}`, details: errorMsgMatch?.[1] || '' }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const points = parseRelayPointsFromXml(xmlText);
      return new Response(JSON.stringify({ success: true, points }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── ACTION: GENERATE LABEL ───────────────────────────────────────────────
    if (action === 'generateLabel') {
      const { order, senderName, senderAddress, senderZip, senderCity, isReturn = false } = body;

      if (!order) {
        return new Response(JSON.stringify({ error: 'order is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const depositDate = new Date().toISOString().split('T')[0];
      const nameParts = (order.customer?.name || 'Client').split(' ');
      const lastName = nameParts.slice(-1)[0] || 'Client';
      const firstName = nameParts.slice(0, -1).join(' ') || 'Client';
      const isRelay = (order.customer?.address || '').toLowerCase().includes('point relais');

      // Product code: REPA for returns, A2P for relay, DOM for home delivery
      let productCode = 'DOM';
      if (isReturn) productCode = 'REPA';
      else if (isRelay) productCode = 'A2P';

      const resolvedSenderName = senderName || 'HELVETICA-MP Concept Store';
      const resolvedSenderAddress = senderAddress || '1 Rue de la Paix';
      const resolvedSenderZip = senderZip || '75001';
      const resolvedSenderCity = senderCity || 'Paris';

      const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://sls.ws.coliposte.fr">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:generateLabel>
      <generateLabelRequest>
        <contractNumber>${escapeXml(COLISSIMO_LOGIN)}</contractNumber>
        <password>${escapeXml(COLISSIMO_PASSWORD)}</password>
        <outputFormat>
          <x>0</x>
          <y>15</y>
          <outputPrintingType>PDF_10x15_300dpi</outputPrintingType>
        </outputFormat>
        <letter>
          <service>
            <productCode>${productCode}</productCode>
            <depositDate>${depositDate}</depositDate>
            <orderNumber>${escapeXml(order.orderNumber || '')}</orderNumber>
          </service>
          <parcel>
            <weight>1.0</weight>
          </parcel>
          <sender>
            <address>
              <companyName>${escapeXml(resolvedSenderName)}</companyName>
              <line2>${escapeXml(resolvedSenderAddress)}</line2>
              <countryCode>FR</countryCode>
              <city>${escapeXml(resolvedSenderCity)}</city>
              <zipCode>${escapeXml(resolvedSenderZip)}</zipCode>
            </address>
          </sender>
          <addressee>
            <address>
              <lastName>${escapeXml(lastName)}</lastName>
              <firstName>${escapeXml(firstName)}</firstName>
              <line2>${escapeXml(order.customer?.address || '')}</line2>
              <countryCode>FR</countryCode>
              <city>${escapeXml(order.customer?.city || '')}</city>
              <zipCode>${escapeXml(order.customer?.zip || '')}</zipCode>
              <phoneNumber>${escapeXml(order.customer?.phone || '')}</phoneNumber>
              <mobileNumber>${escapeXml(order.customer?.phone || '')}</mobileNumber>
              <email>${escapeXml(order.customer?.email || '')}</email>
            </address>
          </addressee>
        </letter>
      </generateLabelRequest>
    </ser:generateLabel>
  </soapenv:Body>
</soapenv:Envelope>`;

      const response = await fetch(COLISSIMO_LABEL_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=UTF-8',
          'SOAPAction': '',
          'Accept': 'multipart/related, text/xml',
        },
        body: soapBody,
      });

      const contentType = response.headers.get('Content-Type') || '';

      if (!response.ok) {
        const errText = await response.text();
        const faultMatch = errText.match(/<faultstring>([^<]+)<\/faultstring>/);
        return new Response(JSON.stringify({ error: 'Colissimo label error', details: faultMatch?.[1] || errText.slice(0, 300) }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (contentType.includes('multipart')) {
        const rawBytes = await response.arrayBuffer();
        const textDecoder = new TextDecoder('utf-8', { fatal: false });
        const fullText = textDecoder.decode(rawBytes);

        const trackingMatch = fullText.match(/<parcelNumber>([^<]+)<\/parcelNumber>/);
        const trackingNumber = trackingMatch ? trackingMatch[1].trim() : null;

        const byteArray = new Uint8Array(rawBytes);
        const pdfStartIdx = findPdfStart(byteArray);
        let pdfBase64: string | null = null;
        if (pdfStartIdx >= 0) {
          const pdfSlice = byteArray.slice(pdfStartIdx);
          const eofIdx = findEof(pdfSlice);
          const pdfBytes = eofIdx > 0 ? pdfSlice.slice(0, eofIdx) : pdfSlice;
          pdfBase64 = uint8ArrayToBase64(pdfBytes);
        }

        return new Response(JSON.stringify({ success: true, trackingNumber, pdfBase64 }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const xmlText = await response.text();
      if (xmlText.includes('<faultcode>')) {
        const faultMatch = xmlText.match(/<faultstring>([^<]+)<\/faultstring>/);
        return new Response(JSON.stringify({ error: 'Colissimo label fault', details: faultMatch?.[1] }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const trackingMatch = xmlText.match(/<parcelNumber>([^<]+)<\/parcelNumber>/);
      return new Response(JSON.stringify({ success: true, trackingNumber: trackingMatch?.[1]?.trim() || null, pdfBase64: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── ACTION: GENERATE BORDEREAU ───────────────────────────────────────────
    if (action === 'generateBordereau') {
      const { senderName, senderAddress, senderZip, senderCity, bordereauDate, trackingNumbers = [] } = body;

      // Colissimo doesn't have a standard SOAP bordereau endpoint in the public API.
      // We return a simple JSON summary; the client generates a text/PDF locally.
      return new Response(JSON.stringify({
        success: true,
        pdfBase64: null, // PDF generation would require La Poste bordereau API access
        summary: {
          date: bordereauDate,
          sender: `${senderName}, ${senderAddress}, ${senderZip} ${senderCity}`,
          packageCount: trackingNumbers.length,
          trackingNumbers,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── ACTION: REFRESH TRACKING STATUSES ───────────────────────────────────
    if (action === 'refreshTrackingStatuses') {
      const { trackingNumbers = [] } = body;
      // La Poste suivi API requires a separate API key (LAPOSTE_API_KEY).
      // Without it, we return a response indicating the feature needs setup.
      const LAPOSTE_API_KEY = Deno.env.get('LAPOSTE_API_KEY');

      if (!LAPOSTE_API_KEY) {
        return new Response(JSON.stringify({
          success: false,
          updated: 0,
          error: 'La clé API La Poste (LAPOSTE_API_KEY) n\'est pas configurée. Fonctionnalité non disponible.',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let updated = 0;
      const results: Array<{ id: string; trackingNumber: string; status: string; delivered: boolean }> = [];

      for (const item of trackingNumbers) {
        try {
          const resp = await fetch(
            `https://api.laposte.fr/suivi/v2/idships/${item.trackingNumber}?lang=fr_FR`,
            { headers: { 'X-Okapi-Key': LAPOSTE_API_KEY } }
          );
          if (!resp.ok) continue;
          const data = await resp.json();
          const event = data?.shipment?.event?.[0];
          if (!event) continue;
          const delivered = event?.code === 'DR1';
          results.push({ id: item.id, trackingNumber: item.trackingNumber, status: event?.label || '', delivered });
          updated++;
        } catch {
          // skip failed lookups
        }
      }

      return new Response(JSON.stringify({ success: true, updated, results }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── ACTION: IMPORT TRACKING NUMBERS ──────────────────────────────────────
    if (action === 'importTrackingNumbers') {
      const { pairs = [] } = body; // [{ orderNumber, trackingNumber }]

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      let count = 0;
      for (const { orderNumber, trackingNumber } of pairs) {
        const { error } = await supabaseAdmin
          .from('orders')
          .update({ tracking_number: trackingNumber, shipping_carrier: 'Colissimo' })
          .eq('order_number', orderNumber);
        if (!error) count++;
      }

      return new Response(JSON.stringify({ success: true, updated: count }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('colissimo-proxy error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseRelayPointsFromXml(xml: string) {
  const points: Record<string, string>[] = [];
  const blockRegex = /<listePointRetraitAcheminement[^>]*>([\s\S]*?)<\/listePointRetraitAcheminement>/g;
  let match;
  while ((match = blockRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`));
      return m ? m[1].trim() : '';
    };
    points.push({
      identifiant: get('identifiant'),
      nom: get('nom'),
      adresse1: get('adresse1'),
      adresse2: get('adresse2'),
      codePostal: get('codePostal'),
      localite: get('localite'),
      libellePays: get('libellePays'),
      distanceEnMetre: get('distanceEnMetre'),
      horairesOuvertureLundi: get('horairesOuvertureLundi'),
      horairesOuvertureMardi: get('horairesOuvertureMardi'),
      horairesOuvertureMercredi: get('horairesOuvertureMercredi'),
      horairesOuvertureJeudi: get('horairesOuvertureJeudi'),
      horairesOuvertureVendredi: get('horairesOuvertureVendredi'),
      horairesOuvertureSamedi: get('horairesOuvertureSamedi'),
      horairesOuvertureDimanche: get('horairesOuvertureDimanche'),
      typeDePoint: get('typeDePoint'),
      lat: get('coordGeolocalisationLatitude'),
      lng: get('coordGeolocalisationLongitude'),
    });
  }
  return points;
}

function findPdfStart(bytes: Uint8Array): number {
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 37 && bytes[i + 1] === 80 && bytes[i + 2] === 68 && bytes[i + 3] === 70) return i;
  }
  return -1;
}

function findEof(bytes: Uint8Array): number {
  const marker = [37, 37, 69, 79, 70];
  for (let i = bytes.length - 1; i >= marker.length; i--) {
    let found = true;
    for (let j = 0; j < marker.length; j++) {
      if (bytes[i - marker.length + 1 + j] !== marker[j]) { found = false; break; }
    }
    if (found) return i + 1;
  }
  return -1;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
