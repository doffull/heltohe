import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const COLISSIMO_RELAY_API = 'https://ws.colissimo.fr/pointretrait-ws-cxf/PointRetraitServiceWS/2.0';
const COLISSIMO_LABEL_API = 'https://ws.colissimo.fr/sls-ws/SlsServiceWS/2.0';

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

    // ─── ACTION: GET RELAY POINTS (SOAP) ─────────────────────────────────────
    if (action === 'getRelayPoints') {
      const { zipCode, city = '', countryCode = 'FR' } = body;

      if (!zipCode) {
        return new Response(JSON.stringify({ error: 'zipCode is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://ws.colissimo.fr">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:getPointRetraitAcheminementByCodePoste>
      <accountNumber>${COLISSIMO_LOGIN}</accountNumber>
      <password>${COLISSIMO_PASSWORD}</password>
      <address></address>
      <zipCode>${zipCode}</zipCode>
      <city>${city}</city>
      <countryCode>${countryCode}</countryCode>
      <optionInter>1</optionInter>
      <reseau>24R</reseau>
      <filterRelay>0</filterRelay>
      <lang>FR</lang>
      <date></date>
      <productCode>A2P</productCode>
      <availableLoadingDate></availableLoadingDate>
      <maxPointChronopost>0</maxPointChronopost>
      <maxPointRelaisColissimo>7</maxPointRelaisColissimo>
      <filterSupportsDeLivraison>1</filterSupportsDeLivraison>
    </ser:getPointRetraitAcheminementByCodePoste>
  </soapenv:Body>
</soapenv:Envelope>`;

      const response = await fetch(COLISSIMO_RELAY_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=UTF-8',
          'SOAPAction': '"getPointRetraitAcheminementByCodePoste"',
        },
        body: soapBody,
      });

      const xmlText = await response.text();
      console.log('Colissimo relay response status:', response.status);
      console.log('Colissimo relay response (first 500):', xmlText.slice(0, 500));

      if (!response.ok) {
        return new Response(JSON.stringify({ error: `Colissimo SOAP error [${response.status}]`, details: xmlText.slice(0, 500) }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse relay points from XML
      const points = parseRelayPointsFromXml(xmlText);

      return new Response(JSON.stringify({ success: true, points }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── ACTION: GENERATE LABEL (SOAP) ───────────────────────────────────────
    if (action === 'generateLabel') {
      const { order } = body;

      if (!order) {
        return new Response(JSON.stringify({ error: 'order is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const depositDate = new Date().toISOString().split('T')[0];
      const lastName = (order.customer?.name || '').split(' ').slice(-1)[0] || 'Client';
      const firstName = (order.customer?.name || '').split(' ').slice(0, -1).join(' ') || 'LVTK6';
      const isRelay = (order.customer?.address || '').toLowerCase().includes('point relais');
      const productCode = isRelay ? 'A2P' : 'DOM';

      const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://sls.ws.coliposte.fr">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:generateLabel>
      <contractNumber>${COLISSIMO_LOGIN}</contractNumber>
      <password>${COLISSIMO_PASSWORD}</password>
      <outputFormat>
        <x>0</x>
        <y>15</y>
        <outputPrintingType>PDF_10x15_300dpi</outputPrintingType>
      </outputFormat>
      <letter>
        <service>
          <productCode>${productCode}</productCode>
          <depositDate>${depositDate}</depositDate>
          <orderNumber>${order.orderNumber}</orderNumber>
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
          'SOAPAction': '"generateLabel"',
        },
        body: soapBody,
      });

      const contentType = response.headers.get('Content-Type') || '';
      console.log('Label response status:', response.status, 'content-type:', contentType);

      if (!response.ok) {
        const errText = await response.text();
        console.error('Colissimo generateLabel error:', errText.slice(0, 500));
        return new Response(JSON.stringify({ error: `Colissimo label error [${response.status}]`, details: errText.slice(0, 500) }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Colissimo returns multipart/mixed: first part is XML response, second is PDF
      if (contentType.includes('multipart')) {
        const rawBytes = await response.arrayBuffer();
        const fullText = new TextDecoder('utf-8', { fatal: false }).decode(rawBytes);

        // Extract tracking number from XML part
        const trackingMatch = fullText.match(/<parcelNumber>([^<]+)<\/parcelNumber>/);
        const trackingNumber = trackingMatch ? trackingMatch[1] : null;

        // Find PDF start marker
        const pdfStartIdx = rawBytes instanceof ArrayBuffer
          ? findPdfStart(new Uint8Array(rawBytes))
          : -1;

        let pdfBase64: string | null = null;
        if (pdfStartIdx >= 0) {
          const pdfSlice = new Uint8Array(rawBytes).slice(pdfStartIdx);
          // Find PDF end marker %%EOF
          const eofMarker = findEof(pdfSlice);
          const pdfBytes = eofMarker > 0 ? pdfSlice.slice(0, eofMarker) : pdfSlice;
          pdfBase64 = uint8ArrayToBase64(pdfBytes);
        }

        console.log('Tracking:', trackingNumber, 'PDF found:', pdfBase64 !== null);
        return new Response(JSON.stringify({ success: true, trackingNumber, pdfBase64 }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Plain XML (error case)
      const xmlText = await response.text();
      const trackingMatch = xmlText.match(/<parcelNumber>([^<]+)<\/parcelNumber>/);
      return new Response(JSON.stringify({ success: true, trackingNumber: trackingMatch?.[1] || null, pdfBase64: null }), {
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
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseRelayPointsFromXml(xml: string) {
  const points: Record<string, string>[] = [];
  const pointRegex = /<pointRetraitAcheminement>([\s\S]*?)<\/pointRetraitAcheminement>/g;
  let match;
  while ((match = pointRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
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
  // %PDF marker in bytes: 37 80 68 70
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 37 && bytes[i + 1] === 80 && bytes[i + 2] === 68 && bytes[i + 3] === 70) {
      return i;
    }
  }
  return -1;
}

function findEof(bytes: Uint8Array): number {
  // %%EOF marker
  const marker = [37, 37, 69, 79, 70]; // %%EOF
  for (let i = bytes.length - 1; i >= marker.length; i--) {
    let found = true;
    for (let j = 0; j < marker.length; j++) {
      if (bytes[i - marker.length + j] !== marker[j]) {
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
