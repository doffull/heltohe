import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const COLISSIMO_RELAY_API = 'https://ws.colissimo.fr/pointretrait-ws-cxf/PointRetraitServiceWS/2.0';
const COLISSIMO_LABEL_API = 'https://ws.colissimo.fr/sls-ws/SlsServiceWS/2.0';
const RELAY_NS = 'http://v2.pointretrait.geopost.com/';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
  if (authError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
    const body = await req.json();
    const { action } = body;

    // ─── ACTION: GET RELAY POINTS (SOAP v2) ───────────────────────────────────
    if (action === 'getRelayPoints') {
      const { zipCode, city = '', countryCode = 'FR' } = body;

      if (!zipCode) {
        return new Response(JSON.stringify({ error: 'zipCode is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Using findRDVPointRetraitAcheminement — the correct v2 operation
      // Date must be in DD/MM/YYYY format
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
      <city>${escapeXml(city)}</city>
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
        headers: {
          'Content-Type': 'text/xml; charset=UTF-8',
          'SOAPAction': '',
        },
        body: soapBody,
      });

      const xmlText = await response.text();
      console.log('Relay status:', response.status);
      if (!response.ok || xmlText.includes('<faultcode>')) {
        const faultMatch = xmlText.match(/<faultstring>([^<]+)<\/faultstring>/);
        const fault = faultMatch ? faultMatch[1] : xmlText.slice(0, 300);
        console.error('Colissimo relay SOAP fault:', fault);
        return new Response(JSON.stringify({ error: `Colissimo SOAP fault`, details: fault }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check errorCode in response
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

    // ─── ACTION: GENERATE LABEL (SOAP) ────────────────────────────────────────
    if (action === 'generateLabel') {
      const { order } = body;

      if (!order) {
        return new Response(JSON.stringify({ error: 'order is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const depositDate = new Date().toISOString().split('T')[0];
      const nameParts = (order.customer?.name || 'Client LVTK6').split(' ');
      const lastName = nameParts.slice(-1)[0] || 'Client';
      const firstName = nameParts.slice(0, -1).join(' ') || 'LVTK6';
      const isRelay = (order.customer?.address || '').toLowerCase().includes('point relais');
      const productCode = isRelay ? 'A2P' : 'DOM';

      const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://sls.ws.coliposte.fr">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:generateLabel>
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
            <companyName>LVTK6 Concept Store</companyName>
            <line2>1 Rue de la Paix</line2>
            <city>Paris</city>
            <zipCode>75001</zipCode>
            <countryCode>FR</countryCode>
          </address>
        </sender>
        <addressee>
          <address>
            <lastName>${escapeXml(lastName)}</lastName>
            <firstName>${escapeXml(firstName)}</firstName>
            <line2>${escapeXml(order.customer?.address || '')}</line2>
            <city>${escapeXml(order.customer?.city || '')}</city>
            <zipCode>${escapeXml(order.customer?.zip || '')}</zipCode>
            <countryCode>FR</countryCode>
            <email>${escapeXml(order.customer?.email || '')}</email>
            <mobileNumber>${escapeXml(order.customer?.phone || '')}</mobileNumber>
          </address>
        </addressee>
      </letter>
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
      console.log('Label status:', response.status, 'content-type:', contentType);

      if (!response.ok) {
        const errText = await response.text();
        const faultMatch = errText.match(/<faultstring>([^<]+)<\/faultstring>/);
        const fault = faultMatch ? faultMatch[1] : errText.slice(0, 300);
        console.error('Label SOAP fault:', fault);
        return new Response(JSON.stringify({ error: 'Colissimo label error', details: fault }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (contentType.includes('multipart')) {
        const rawBytes = await response.arrayBuffer();
        const textDecoder = new TextDecoder('utf-8', { fatal: false });
        const fullText = textDecoder.decode(rawBytes);

        // Extract tracking number
        const trackingMatch = fullText.match(/<parcelNumber>([^<]+)<\/parcelNumber>/);
        const trackingNumber = trackingMatch ? trackingMatch[1].trim() : null;

        // Find PDF binary
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

      // Plain XML fallback
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

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('colissimo-proxy error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(err) }), {
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
  // Match both pointRetraitAcheminement blocks
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
    });
  }
  return points;
}

function findPdfStart(bytes: Uint8Array): number {
  // %PDF = 37 80 68 70
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 37 && bytes[i + 1] === 80 && bytes[i + 2] === 68 && bytes[i + 3] === 70) {
      return i;
    }
  }
  return -1;
}

function findEof(bytes: Uint8Array): number {
  // %%EOF = 37 37 69 79 70
  const marker = [37, 37, 69, 79, 70];
  for (let i = bytes.length - 1; i >= marker.length; i--) {
    let found = true;
    for (let j = 0; j < marker.length; j++) {
      if (bytes[i - marker.length + 1 + j] !== marker[j]) {
        found = false;
        break;
      }
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
