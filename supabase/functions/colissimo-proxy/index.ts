import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const COLISSIMO_API = 'https://ws.colissimo.fr';

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
  const { data, error: authError } = await supabase.auth.getClaims(token);
  if (authError || !data?.claims) {
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

    // ─── ACTION: GET RELAY POINTS ─────────────────────────────────────────────
    if (action === 'getRelayPoints') {
      const { zipCode, city = '', countryCode = 'FR', deliveryMode = 'RDV', maxPointChronopost = 5, maxPointRelaisColissimo = 5 } = body;

      if (!zipCode) {
        return new Response(JSON.stringify({ error: 'zipCode is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload = {
        accountNumber: COLISSIMO_LOGIN,
        password: COLISSIMO_PASSWORD,
        address: '',
        zipCode,
        city,
        countryCode,
        optionInter: '1',
        filterRelay: '0',
        requestId: '',
        lang: 'FR',
        resurce: '',
        date: '',
        productCode: 'A2P',
        availableLoadingDate: '',
        maxPointChronopost,
        maxPointRelaisColissimo,
        filterSupportsDeLivraison: '1',
        thresholdPallets: '',
      };

      const response = await fetch(
        `${COLISSIMO_API}/pointretrait-ws-cxf/PointRetraitServiceWS/2.0/getPointRetraitAcheminement`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error('Colissimo getRelayPoints error:', errText);
        return new Response(JSON.stringify({ error: `Colissimo API error [${response.status}]`, details: errText }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();

      // Normalize relay points list
      const points = (data?.listePointRetraitAcheminement || []).map((p: Record<string, unknown>) => ({
        identifiant: p.identifiant,
        nom: p.nom,
        adresse1: p.adresse1,
        adresse2: p.adresse2,
        codePostal: p.codePostal,
        localite: p.localite,
        libellePays: p.libellePays,
        coordGeolocalisationLatitude: p.coordGeolocalisationLatitude,
        coordGeolocalisationLongitude: p.coordGeolocalisationLongitude,
        distanceEnMetre: p.distanceEnMetre,
        horairesOuvertureLundi: p.horairesOuvertureLundi,
        horairesOuvertureMardi: p.horairesOuvertureMardi,
        horairesOuvertureMercredi: p.horairesOuvertureMercredi,
        horairesOuvertureJeudi: p.horairesOuvertureJeudi,
        horairesOuvertureVendredi: p.horairesOuvertureVendredi,
        horairesOuvertureSamedi: p.horairesOuvertureSamedi,
        horairesOuvertureDimanche: p.horairesOuvertureDimanche,
        typeDePoint: p.typeDePoint,
      }));

      return new Response(JSON.stringify({ success: true, points }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── ACTION: GENERATE LABEL ───────────────────────────────────────────────
    if (action === 'generateLabel') {
      const { order } = body;

      if (!order) {
        return new Response(JSON.stringify({ error: 'order is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isRelay = order.customer?.address?.includes('Point Relais');

      const payload = {
        contractNumber: COLISSIMO_LOGIN,
        password: COLISSIMO_PASSWORD,
        outputFormat: {
          x: 0,
          y: 15,
          outputPrintingType: 'PDF_10x15_300dpi',
        },
        letter: {
          service: {
            productCode: isRelay ? 'A2P' : 'DOM',
            depositDate: new Date().toISOString().split('T')[0],
            orderNumber: order.orderNumber,
          },
          parcel: {
            weight: 1.0,
          },
          sender: {
            address: {
              companyName: 'LVTK6 Concept Store',
              line2: '1 Rue de la Paix',
              city: 'Paris',
              zipCode: '75001',
              countryCode: 'FR',
            },
          },
          addressee: {
            address: {
              lastName: order.customer?.name?.split(' ').slice(-1)[0] || order.customer?.name || '',
              firstName: order.customer?.name?.split(' ').slice(0, -1).join(' ') || '',
              line2: order.customer?.address || '',
              city: order.customer?.city || '',
              zipCode: order.customer?.zip || '',
              countryCode: 'FR',
              email: order.customer?.email || '',
              mobileNumber: order.customer?.phone || '',
            },
          },
        },
      };

      const response = await fetch(
        `${COLISSIMO_API}/sls-ws/SlsServiceWS/2.0/generateLabel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error('Colissimo generateLabel error:', errText);
        return new Response(JSON.stringify({ error: `Colissimo API error [${response.status}]`, details: errText }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const contentType = response.headers.get('Content-Type') || '';

      // Colissimo returns multipart/mixed with PDF + JSON metadata
      if (contentType.includes('multipart')) {
        const rawBytes = await response.arrayBuffer();
        const text = new TextDecoder().decode(rawBytes);

        // Extract tracking number from JSON part
        const jsonMatch = text.match(/\{[\s\S]*"parcelNumber"\s*:\s*"([^"]+)"[\s\S]*\}/);
        const trackingNumber = jsonMatch ? jsonMatch[1] : null;

        // Find PDF bytes (starts with %PDF)
        const pdfStart = text.indexOf('%PDF');
        let pdfBase64 = null;
        if (pdfStart >= 0) {
          const pdfBytes = new Uint8Array(rawBytes.slice(pdfStart));
          pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
        }

        return new Response(JSON.stringify({ success: true, trackingNumber, pdfBase64 }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fallback: JSON response
      const data = await response.json();
      return new Response(JSON.stringify({ success: true, ...data }), {
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
