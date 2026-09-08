import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Briques d'étiquetage communes avec create-colissimo-label.
import {
  PICKUP_PRODUCT_CODES,
  escapeXml,
  parseRelayPointsFromXml,
  resolvePickupPoint,
  sanitizeAddressLine,
} from '../_shared/colissimo.ts';

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

  // Le front peut envoyer une clé publique héritée (`eyJ…` role anon) DIFFÉRENTE de
  // celle injectée ici, ou une clé `sb_publishable_…`. Dans les deux cas seule l'API
  // Auth du projet peut trancher : elle rejette toute clé étrangère.
  try {
    // `/auth/v1/settings` accepte les clés publiques et renvoie 401 pour toute clé
    // étrangère au projet. (`/rest/v1/` ne convient pas : il exige une clé secrète.)
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/settings`, {
      headers: { apikey: token, Authorization: `Bearer ${token}` },
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

  // On tente d'abord la session utilisateur : un vrai jeton de session porte des
  // claims (`sub`), indispensables aux actions admin.
  let claims: Record<string, any> | null = null;
  const { data: claimsData } = await supabase.auth.getClaims(token);
  if (claimsData?.claims?.sub) {
    claims = claimsData.claims as Record<string, any>;
  }

  // Pas de session : ce peut être la clé publique du projet (anon héritée `eyJ…` ou
  // `sb_publishable_…`) envoyée par un visiteur non connecté. Elle n'ouvre que les
  // actions publiques.
  if (!claims) {
    const isProjectKey = await isProjectPublicKey(token);
    if (!isProjectKey) return unauthorized();
    if (!isPublicAction) return unauthorized();
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
      const { city = '-', countryCode = 'FR' } = body;
      const safeCity = String(city ?? '').trim() || '-';
      // Colissimo refuse tout code postal hors métropole (01000-95999) ou DOM 980xx
      // avec l'erreur 125. On le filtre ici pour renvoyer un message clair (400).
      const zipCode = String(body.zipCode ?? '').replace(/\s+/g, '');

      if (!zipCode) {
        return new Response(JSON.stringify({ error: 'zipCode is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isValidFrZip =
        /^\d{5}$/.test(zipCode) &&
        ((parseInt(zipCode.slice(0, 2), 10) >= 1 && parseInt(zipCode.slice(0, 2), 10) <= 95) ||
          zipCode.startsWith('980'));

      if (countryCode === 'FR' && !isValidFrZip) {
        return new Response(
          JSON.stringify({
            error: 'Code postal invalide',
            details: 'Saisissez un code postal français valide (01000 à 95999, ou 980XX pour Monaco).',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }


      // La Poste refuse certaines dates d'expédition (dimanche / jour férié) avec un
      // code d'erreur. On tente le jour courant puis, en cas d'échec, les jours
      // ouvrés suivants.
      const fmt = (d: Date) =>
        `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const candidates: string[] = [];
      const cursor = new Date();
      while (candidates.length < 3) {
        if (cursor.getDay() !== 0) candidates.push(fmt(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }

      let lastError: { error: string; details: string; status: number } | null = null;

      for (const shippingDate of candidates) {
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
          lastError = {
            error: 'Service La Poste indisponible',
            details: faultMatch ? faultMatch[1] : xmlText.slice(0, 300),
            status: 502,
          };
          continue;
        }

        const errorCodeMatch = xmlText.match(/<errorCode>([^<]+)<\/errorCode>/);
        const errorCode = errorCodeMatch ? parseInt(errorCodeMatch[1]) : 0;
        if (errorCode !== 0) {
          const errorMsgMatch = xmlText.match(/<errorMessage>([^<]+)<\/errorMessage>/);
          lastError = {
            error: 'Recherche refusée par La Poste',
            details: `Code ${errorCode}${errorMsgMatch?.[1] ? ` — ${errorMsgMatch[1]}` : ''} (date ${shippingDate})`,
            status: 422,
          };
          continue;
        }

        const points = parseRelayPointsFromXml(xmlText);
        return new Response(JSON.stringify({ success: true, points, shippingDate }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ error: lastError?.error || 'Recherche impossible', details: lastError?.details || '' }),
        { status: lastError?.status ?? 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
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
      const customerAddress = String(order.customer?.address || '');
      const isRelay = customerAddress.toLowerCase().includes('point relais');

      // ── Point de retrait ─────────────────────────────────────────────────
      // L'identifiant peut être fourni par l'appelant (commandes futures, une
      // fois qu'il sera stocké) ; sinon on le retrouve chez La Poste à partir
      // du libellé, ce qui couvre toutes les commandes déjà passées.
      let pickupLocationId = String(order.pickupLocationId || '').trim();
      let pickupType = String(order.pickupLocationType || '').trim().toUpperCase();
      let addresseeLine = customerAddress;

      if (isRelay && !isReturn) {
        const resolved = await resolvePickupPoint(customerAddress, COLISSIMO_LOGIN, COLISSIMO_PASSWORD);
        if (resolved) {
          if (!pickupLocationId) pickupLocationId = resolved.id;
          if (!pickupType) pickupType = resolved.type;
          // En livraison hors domicile, l'adresse du destinataire reste la
          // sienne : c'est `pickupLocationId` qui détermine le lieu de retrait.
          // Y recopier l'adresse du point de retrait produit une étiquette
          // incohérente, en plus de dépasser les 35 caractères autorisés.
          if (resolved.customerLine) addresseeLine = resolved.customerLine;
        }

        if (!pickupLocationId) {
          return new Response(
            JSON.stringify({
              error: 'Point de retrait introuvable',
              details:
                "Impossible de retrouver ce point chez La Poste à partir de l'adresse enregistrée. " +
                'Vérifiez le point relais de la commande, ou générez une étiquette à domicile.',
            }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      // Code produit : REPA pour un retour, le type réel du point pour un
      // retrait hors domicile (BPR = bureau de poste, A2P = commerçant…),
      // DOM à domicile. Forcer A2P sur un bureau de poste — ce que faisait ce
      // code — fait refuser l'étiquette par Colissimo.
      let productCode = 'DOM';
      if (isReturn) productCode = 'REPA';
      else if (isRelay) productCode = PICKUP_PRODUCT_CODES.has(pickupType) ? pickupType : 'A2P';

      const resolvedSenderName = senderName || 'HELVETICA-MP Concept Store';
      const resolvedSenderAddress = senderAddress || '1 Rue de la Paix';
      const resolvedSenderZip = senderZip || '75001';
      const resolvedSenderCity = senderCity || 'Paris';

      // À défaut d'être fourni, on reprend la raison sociale de l'expéditeur.
      const commercialName = sanitizeAddressLine(body.commercialName || resolvedSenderName);

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
          <!-- commercialName est le nom sous lequel le destinataire voit
               l'expedition, sur l'etiquette comme sur l'avis de passage.
               Colissimo l'exige en livraison hors domicile : sans lui,
               "[30018] Le nom commercial n'a pas ete transmis". Sa place
               dans la sequence est imposee : apres orderNumber. -->
          <service>
            <productCode>${productCode}</productCode>
            <depositDate>${depositDate}</depositDate>
            <orderNumber>${escapeXml(order.orderNumber || '')}</orderNumber>
            <commercialName>${escapeXml(commercialName)}</commercialName>
          </service>
          <!-- ⚠️ En SOAP, pickupLocationId appartient à <parcel>, APRÈS <weight>
               — et non à <service> comme le veut l'API REST. Le placer dans
               <service> fait échouer la validation du schéma :
               « Invalid content was found starting with element
               'pickupLocationId'. One of {commercialName, returnTypeChoice,
               reseauPostal} is expected ». L'ordre de la séquence XSD est
               strict, ne pas déplacer cette ligne. -->
          <parcel>
            <weight>1.0</weight>
            ${pickupLocationId ? `<pickupLocationId>${escapeXml(pickupLocationId)}</pickupLocationId>` : ''}
          </parcel>
          <sender>
            <address>
              <companyName>${escapeXml(sanitizeAddressLine(resolvedSenderName))}</companyName>
              <line2>${escapeXml(sanitizeAddressLine(resolvedSenderAddress))}</line2>
              <countryCode>FR</countryCode>
              <city>${escapeXml(resolvedSenderCity)}</city>
              <zipCode>${escapeXml(resolvedSenderZip)}</zipCode>
            </address>
          </sender>
          <addressee>
            <address>
              <lastName>${escapeXml(lastName)}</lastName>
              <firstName>${escapeXml(firstName)}</firstName>
              <line2>${escapeXml(sanitizeAddressLine(addresseeLine))}</line2>
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

        // Colissimo répond 200 même lorsqu'il refuse : le motif est dans
        // <messages>. Sans numéro de colis, il n'y a pas d'étiquette — répondre
        // `success: true` avec des champs à null, comme le faisait ce code,
        // faisait passer un refus pour une réussite silencieuse.
        if (!trackingNumber) {
          return colissimoRefusal(fullText);
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
      if (!trackingMatch) {
        return colissimoRefusal(xmlText);
      }
      return new Response(JSON.stringify({ success: true, trackingNumber: trackingMatch[1].trim(), pdfBase64: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── ACTION: GENERATE BORDEREAU ───────────────────────────────────────────
    if (action === 'generateBordereau') {
      const { senderName, senderAddress, senderZip, senderCity, bordereauDate, trackingNumbers = [] } = body;

      const numbers = (Array.isArray(trackingNumbers) ? trackingNumbers : [])
        .map((n: unknown) => String(n || '').trim())
        .filter(Boolean);

      if (numbers.length === 0) {
        return new Response(JSON.stringify({ error: 'Aucun numéro de colis à porter au bordereau' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Ce bloc renvoyait `pdfBase64: null` en expliquant que Colissimo n'offre
      // pas de service de bordereau en SOAP. C'est inexact : le WSDL publié par
      // ws.colissimo.fr expose `generateBordereauByParcelsNumbers`. Faute de
      // PDF, l'écran d'administration retombait sur son repli et téléchargeait
      // un fichier texte à la place du bordereau de dépôt.
      const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://sls.ws.coliposte.fr">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:generateBordereauByParcelsNumbers>
      <contractNumber>${escapeXml(COLISSIMO_LOGIN)}</contractNumber>
      <password>${escapeXml(COLISSIMO_PASSWORD)}</password>
      <generateBordereauParcelNumberList>
        ${numbers.map((n) => `<parcelsNumbers>${escapeXml(n)}</parcelsNumbers>`).join('\n        ')}
      </generateBordereauParcelNumberList>
    </ser:generateBordereauByParcelsNumbers>
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

      if (!response.ok) {
        const errText = await response.text();
        const faultMatch = errText.match(/<faultstring>([^<]+)<\/faultstring>/);
        return new Response(
          JSON.stringify({ error: 'Colissimo bordereau error', details: faultMatch?.[1] || errText.slice(0, 300) }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const rawBytes = await response.arrayBuffer();
      const fullText = new TextDecoder('utf-8', { fatal: false }).decode(rawBytes);

      // Le PDF arrive soit en pièce jointe MTOM — comme pour les étiquettes —
      // soit encodé dans <bordereauDataHandler>. Les deux cas sont couverts.
      let pdfBase64: string | null = null;
      const inlineMatch = fullText.match(/<bordereauDataHandler>([\s\S]*?)<\/bordereauDataHandler>/);
      if (inlineMatch && !inlineMatch[1].includes('<')) {
        pdfBase64 = inlineMatch[1].replace(/\s+/g, '');
      }
      if (!pdfBase64) {
        const bytes = new Uint8Array(rawBytes);
        const start = findPdfStart(bytes);
        if (start >= 0) {
          const slice = bytes.slice(start);
          const eof = findEof(slice);
          pdfBase64 = uint8ArrayToBase64(eof > 0 ? slice.slice(0, eof) : slice);
        }
      }

      if (!pdfBase64) {
        return colissimoRefusal(fullText);
      }

      const bordereauNumber = fullText.match(/<bordereauNumber>([^<]+)<\/bordereauNumber>/)?.[1]?.trim() || null;
      const numberOfParcels = fullText.match(/<numberOfParcels>([^<]+)<\/numberOfParcels>/)?.[1]?.trim() || null;

      return new Response(JSON.stringify({
        success: true,
        pdfBase64,
        bordereauNumber,
        summary: {
          date: bordereauDate,
          sender: `${senderName}, ${senderAddress}, ${senderZip} ${senderCity}`,
          packageCount: numberOfParcels ? Number(numberOfParcels) : numbers.length,
          trackingNumbers: numbers,
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

/**
 * Colissimo accompagne chaque réponse d'un ou plusieurs blocs :
 *   <messages><id>30109</id><type>ERROR</type><messageContent>…</messageContent></messages>
 * Un refus arrive en HTTP 200, le motif n'étant que là-dedans.
 */
function parseColissimoMessages(xml: string): { id: string; type: string; content: string }[] {
  const out: { id: string; type: string; content: string }[] = [];
  const blocks = xml.matchAll(/<messages>([\s\S]*?)<\/messages>/g);
  for (const block of blocks) {
    const get = (tag: string) => block[1].match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() || '';
    const entry = { id: get('id'), type: get('type').toUpperCase(), content: get('messageContent') };
    if (entry.id || entry.content) out.push(entry);
  }
  return out;
}

/** Réponse d'échec construite à partir des messages renvoyés par Colissimo. */
function colissimoRefusal(xml: string): Response {
  const messages = parseColissimoMessages(xml);
  const errors = messages.filter((m) => m.type === 'ERROR');
  const shown = (errors.length ? errors : messages)
    .map((m) => (m.id ? `[${m.id}] ${m.content}` : m.content))
    .filter(Boolean);

  return new Response(
    JSON.stringify({
      error: "Colissimo n'a pas produit d'étiquette",
      details: shown.length
        ? shown.join(' · ')
        : "Aucun numéro de colis dans la réponse, et aucun message d'erreur exploitable.",
      messages,
    }),
    { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
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
