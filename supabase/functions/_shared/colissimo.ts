// Briques communes aux deux voies d'étiquetage Colissimo : `colissimo-proxy`
// (SOAP, utilisé par l'écran /admin/colissimo) et `create-colissimo-label`
// (REST, utilisé par /admin/bordereau/:id).
//
// Les deux interfaces divergent sur la forme mais pas sur le fond : dans les
// deux, `pickupLocationId` appartient à `parcel` et `commercialName` à
// `service`. Ce qui suit est donc valable des deux côtés.

const COLISSIMO_RELAY_API = 'https://ws.colissimo.fr/pointretrait-ws-cxf/PointRetraitServiceWS/2.0';
const RELAY_NS = 'http://v2.pointretrait.geopost.com/';

// ─── POINTS DE RETRAIT : résolution de l'identifiant ────────────────────────
//
// Colissimo exige `pickupLocationId` pour tout code produit hors domicile
// (A2P, BPR, ACP, CDI, CMT, BDP, PCS). Or le checkout ne garde du point choisi
// qu'une phrase d'affichage : l'identifiant et le type sont perdus avant même
// l'enregistrement de la commande. D'où 0 étiquette relais sur 16 commandes,
// contre 4 sur 18 en livraison à domicile.
//
// Plutôt que d'imposer d'abord une reprise de la base et du tunnel d'achat, on
// relit le point chez La Poste au moment de l'étiquette, à partir du nom et du
// code postal contenus dans l'adresse. Les commandes déjà passées redeviennent
// donc imprimables, sans migration.
//
// Le jour où l'identifiant sera stocké à la commande, il suffira de le passer
// dans `pickupLocationId` : cette résolution ne servira plus que de repli.
export const PICKUP_PRODUCT_CODES = new Set(['A2P', 'BPR', 'ACP', 'CDI', 'CMT', 'BDP', 'PCS']);

/** Interroge le service points de retrait. Renvoie [] en cas d'échec. */
export async function findRelayPoints(
  zipCode: string,
  city: string,
  login: string,
  password: string,
): Promise<Record<string, string>[]> {
  const now = new Date();
  // Le service refuse le dimanche : on décale au lendemain le cas échéant.
  if (now.getDay() === 0) now.setDate(now.getDate() + 1);
  const shippingDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${RELAY_NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:findRDVPointRetraitAcheminement>
      <accountNumber>${escapeXml(login)}</accountNumber>
      <password>${escapeXml(password)}</password>
      <address></address>
      <zipCode>${escapeXml(zipCode)}</zipCode>
      <city>${escapeXml(city || '-')}</city>
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

  try {
    const res = await fetch(COLISSIMO_RELAY_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'SOAPAction': '' },
      body: soapBody,
    });
    const xml = await res.text();
    if (!res.ok || xml.includes('<faultcode>')) return [];
    const errorCode = xml.match(/<errorCode>([^<]+)<\/errorCode>/);
    if (errorCode && parseInt(errorCode[1]) !== 0) return [];
    return parseRelayPointsFromXml(xml);
  } catch {
    return [];
  }
}

/** Comparaison de libellés insensible à la casse, aux accents et à la ponctuation. */
export function normalizeLabel(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

/**
 * Décompose l'adresse fabriquée par le checkout :
 *   `Point Relais: <NOM> — <VOIE>, <CP> <VILLE> — <adresse personnelle>`
 * Renvoie null si la chaîne ne suit pas ce format.
 */
export function parseRelayAddress(address: string): {
  name: string;
  zip: string;
  city: string;
  customerLine: string;
} | null {
  const raw = String(address || '');
  if (!/point relais\s*:/i.test(raw)) return null;

  const afterPrefix = raw.replace(/^[\s\S]*?point relais\s*:\s*/i, '');
  // Le séparateur est un tiret cadratin, mais on tolère un tiret simple.
  const parts = afterPrefix.split(/\s+[—–-]\s+/);
  const name = (parts[0] || '').trim();
  const locality = (parts[1] || '').trim();
  const customerLine = parts.slice(2).join(' ').trim();

  const zipMatch = locality.match(/\b(\d{5})\b/);
  if (!name || !zipMatch) return null;

  const city = locality.slice(locality.indexOf(zipMatch[1]) + 5).trim();
  return { name, zip: zipMatch[1], city, customerLine };
}

/**
 * Retrouve l'identifiant et le type du point de retrait choisi.
 * Seule une correspondance de nom exacte est acceptée : un point voisin
 * livrerait le colis au mauvais endroit, mieux vaut échouer avec un message
 * clair que de deviner.
 */
export async function resolvePickupPoint(
  address: string,
  login: string,
  password: string,
): Promise<{ id: string; type: string; customerLine: string } | null> {
  const parsed = parseRelayAddress(address);
  if (!parsed) return null;

  const points = await findRelayPoints(parsed.zip, parsed.city, login, password);
  const wanted = normalizeLabel(parsed.name);
  const hit = points.find((p) => normalizeLabel(p.nom) === wanted);
  if (!hit?.identifiant) return null;

  return {
    id: hit.identifiant,
    type: (hit.typeDePoint || '').trim().toUpperCase(),
    customerLine: parsed.customerLine,
  };
}

/**
 * Colissimo plafonne chaque ligne d'adresse à 35 caractères et rejette les
 * signes hors jeu latin de base — le tiret cadratin du libellé en fait partie.
 */
export function sanitizeAddressLine(value: string, max = 35): string {
  return String(value || '')
    .replace(/[—–]/g, '-')
    // Apostrophes et guillemets typographiques : présents dans les adresses
    // saisies depuis un téléphone (« Sabots D’helene »), hors jeu Colissimo.
    .replace(/[’‘‚‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[,;]+$/, '')
    .slice(0, max);
}


export function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function parseRelayPointsFromXml(xml: string) {
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

