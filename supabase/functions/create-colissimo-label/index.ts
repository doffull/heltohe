import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Fusion des PDF renvoyés par Colissimo (étiquette + CN23) — voir `extractPdf`.
// Même version et même passerelle que `order-slip-pdf`, qui s'en sert déjà.
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1?target=deno';
// Briques d'étiquetage communes avec colissimo-proxy.
import {
  PICKUP_PRODUCT_CODES,
  resolvePickupPoint,
  sanitizeAddressLine,
} from '../_shared/colissimo.ts';
import {
  getCapability,
  normalizeCountryCode,
  requiresCn23,
  resolveHomeProductCode,
  SENDER_COUNTRY,
} from '../_shared/colissimo-countries.ts';

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

/**
 * Extraction des PDF d'une réponse `multipart/related` Colissimo.
 *
 * ── Ce que faisait le code précédent, et pourquoi c'était faux ─────────────
 *
 * Il prenait tout, du PREMIER `%PDF` au DERNIER `%%EOF`. Tant que Colissimo
 * ne renvoyait qu'un document, ça marchait. Dès qu'une déclaration douanière
 * est demandée, il en renvoie DEUX — l'étiquette, puis la CN23 — dans deux
 * parties distinctes. Le découpage collait alors les deux bout à bout et le
 * tout était stocké comme un seul fichier.
 *
 * Un PDF ainsi concaténé est invalide, et le pire est qu'aucune erreur n'est
 * levée : le fichier s'ouvre, mais ce qu'on y voit dépend du lecteur. Certains
 * lisent le premier en-tête et n'affichent que l'étiquette ; d'autres suivent
 * le dernier `startxref` et n'affichent que la CN23 — sans l'étiquette. Un des
 * deux documents disparaît toujours, silencieusement.
 *
 * Constaté sur les 7 commandes suisses émises depuis l'ouverture de
 * l'international : toutes portaient deux `%PDF`. Les commandes françaises et
 * belges n'en ont qu'un — l'UE n'exige pas de CN23 — d'où un défaut resté
 * invisible tant qu'on n'expédiait qu'en zone euro.
 */

/**
 * Découpe une réponse multipart en ses parties, sur la `boundary` annoncée.
 *
 * On lit la frontière déclarée plutôt que de deviner : c'est la seule
 * information qui dise où s'arrête réellement une partie. Le repli par
 * recherche de `%PDF` reste possible (voir `splitPdfDocuments`) pour le cas
 * où l'en-tête manquerait.
 */
function splitMultipartParts(bytes: Uint8Array, contentType: string | null): Uint8Array[] {
  const match = /boundary="?([^";]+)"?/i.exec(contentType ?? '');
  if (!match) return [];

  const delimiter = new TextEncoder().encode(`--${match[1]}`);
  const positions: number[] = [];
  outer: for (let i = 0; i <= bytes.length - delimiter.length; i++) {
    for (let j = 0; j < delimiter.length; j++) {
      if (bytes[i + j] !== delimiter[j]) continue outer;
    }
    positions.push(i);
  }
  if (positions.length < 2) return [];

  const parts: Uint8Array[] = [];
  for (let i = 0; i < positions.length - 1; i++) {
    // Le corps commence après les en-têtes de la partie, séparés par une
    // ligne vide. `\r\n\r\n` est la forme normalisée ; `\n\n` est toléré, des
    // passerelles réécrivant les fins de ligne.
    const slice = bytes.slice(positions[i] + delimiter.length, positions[i + 1]);
    const head = new TextDecoder('utf-8', { fatal: false }).decode(
      slice.slice(0, Math.min(slice.length, 2048)),
    );
    const crlf = head.indexOf('\r\n\r\n');
    const lf = head.indexOf('\n\n');
    const offset = crlf >= 0 ? crlf + 4 : lf >= 0 ? lf + 2 : -1;
    if (offset < 0) continue;
    parts.push(slice.slice(offset));
  }
  return parts;
}

/** Position de chaque en-tête `%PDF` dans un bloc d'octets. */
function findPdfHeaders(bytes: Uint8Array): number[] {
  const marker = new TextEncoder().encode('%PDF');
  const out: number[] = [];
  outer: for (let i = 0; i <= bytes.length - marker.length; i++) {
    for (let j = 0; j < marker.length; j++) {
      if (bytes[i + j] !== marker[j]) continue outer;
    }
    out.push(i);
  }
  return out;
}

/**
 * Repli : isole les documents PDF d'un bloc d'octets quelconque.
 *
 * Contrairement à la version précédente, la découpe se fait à CHAQUE `%PDF`
 * et non du premier au dernier. Deux documents restent donc deux documents.
 */
function splitPdfDocuments(bytes: Uint8Array): Uint8Array[] {
  const starts = findPdfHeaders(bytes);
  if (starts.length === 0) return [];

  const eof = new TextEncoder().encode('%%EOF');
  return starts.map((start, n) => {
    const limit = n + 1 < starts.length ? starts[n + 1] : bytes.length;
    // Dernier `%%EOF` AVANT le document suivant : on ne déborde jamais sur lui.
    let end = limit;
    outer: for (let i = limit - eof.length; i > start; i--) {
      for (let j = 0; j < eof.length; j++) {
        if (bytes[i + j] !== eof[j]) continue outer;
      }
      end = i + eof.length;
      break;
    }
    return bytes.slice(start, end);
  });
}

/**
 * Renvoie UN PDF valide contenant tout ce que Colissimo a produit.
 *
 * Un seul document → il est renvoyé **tel quel**, octet pour octet. C'est
 * délibéré : les envois France représentent l'écrasante majorité du volume et
 * fonctionnent aujourd'hui ; les faire repasser par une réécriture les
 * exposerait à un risque pour un gain nul.
 *
 * Plusieurs documents → fusion en un seul fichier : page 1 l'étiquette, puis
 * les pages de la CN23. C'est ce que l'exploitant imprime, dans l'ordre où il
 * s'en sert.
 */
async function extractPdf(
  bytes: Uint8Array,
  contentType: string | null,
): Promise<Uint8Array | null> {
  const fromParts = splitMultipartParts(bytes, contentType)
    .map((part) => splitPdfDocuments(part))
    .flat();
  const documents = fromParts.length > 0 ? fromParts : splitPdfDocuments(bytes);

  if (documents.length === 0) return null;
  if (documents.length === 1) return documents[0];

  try {
    const merged = await PDFDocument.create();
    for (const doc of documents) {
      const source = await PDFDocument.load(doc, { ignoreEncryption: true });
      const pages = await merged.copyPages(source, source.getPageIndices());
      for (const page of pages) merged.addPage(page);
    }
    return await merged.save();
  } catch (e) {
    // Une fusion ratée ne doit pas empêcher le colis de partir : on garde
    // l'étiquette seule, qui est un PDF valide, et on le signale. Mieux vaut
    // une CN23 à réimprimer à la main qu'une expédition bloquée — et surtout
    // qu'un fichier corrompu de plus.
    console.error(
      'Fusion des PDF Colissimo impossible, seule l\'étiquette est conservée',
      String(e),
    );
    return documents[0];
  }
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

/** PDF → base64, par tranches : `String.fromCharCode(...bytes)` déborde la pile
 *  au-delà de ~100 ko, et une étiquette en pèse 91. */
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

/**
 * Cherche l'étiquette déjà émise pour cette commande, et la renvoie telle
 * quelle. `null` ⇒ il n'y en a pas, l'affranchissement peut avoir lieu.
 *
 * ⚠️ L'ALLER et le RETOUR ne se reconnaissent pas de la même façon.
 *
 * L'aller laisse une trace en base (`tracking_number`, `label_path`). Le retour
 * n'en laisse aucune : `orders` n'a pas de colonne pour lui, et la fonction ne
 * met rien à jour quand `is_return` est vrai. Sa seule trace est le fichier
 * `labels/<orderId>/retour-*.pdf` — c'est donc le stockage qui fait foi.
 *
 * ⚠️ Un suivi SANS fichier ne relance pas un affranchissement. Le colis est
 * déjà déclaré chez Colissimo ; en refaire un donnerait deux colis pour un
 * envoi. On répond une erreur explicite, qui dit quoi faire. Même position que
 * `order-slip-pdf` : « on s'abstient de réaffranchir — ce serait un second
 * colis pour La Poste ».
 */
async function findExistingLabel(
  admin: ReturnType<typeof createClient>,
  orderId: string,
  isReturn: boolean,
  order: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  let path: string | null = null;

  if (isReturn) {
    // Le plus récent des `retour-*.pdf` : les chemins sont horodatés, l'ordre
    // alphabétique suffit donc à les classer.
    const { data: files } = await admin.storage.from('labels').list(orderId, {
      limit: 100,
      sortBy: { column: 'name', order: 'desc' },
    });
    const found = (files || []).find((f) => f.name.startsWith('retour-'));
    if (!found) return null;
    path = `${orderId}/${found.name}`;
  } else {
    const tracking = String(order.tracking_number || '').trim();
    if (!tracking) return null;

    path = typeof order.label_path === 'string' ? order.label_path : null;
    if (!path) {
      return {
        error: 'Étiquette déjà affranchie, fichier introuvable',
        details:
          `La commande porte le suivi ${tracking} mais aucune étiquette n'est archivée. ` +
          `Réaffranchir créerait un second colis. Supprimez le numéro de suivi depuis ` +
          `l'écran Colissimo pour repartir de zéro, ou rappelez la fonction avec force: true.`,
        trackingNumber: tracking,
        reused: false,
      };
    }
  }

  const { data: file } = await admin.storage.from('labels').download(path);
  if (!file) {
    // Chemin enregistré mais objet absent : même raisonnement, on n'affranchit pas.
    if (isReturn) return null;
    return {
      error: 'Étiquette déjà affranchie, fichier introuvable',
      details:
        `Le fichier ${path} a disparu du stockage. Réaffranchir créerait un second ` +
        `colis : supprimez le numéro de suivi pour repartir de zéro, ou forcez avec force: true.`,
      trackingNumber: String(order.tracking_number || '') || null,
      reused: false,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { data: signed } = await admin.storage.from('labels').createSignedUrl(path, 60 * 60 * 24 * 7);

  return {
    success: true,
    // `reused: true` est le signal que les appelants attendent pour NE PAS
    // renvoyer l'e-mail d'expédition : rien n'a changé pour la cliente.
    reused: true,
    trackingNumber: isReturn ? null : String(order.tracking_number || '') || null,
    path,
    signedUrl: signed?.signedUrl ?? null,
    pdfBase64: toBase64(bytes),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const bearer = authHeader.replace('Bearer ', '').trim();

  // `auto-colissimo-label` appelle cette fonction de serveur à serveur, avec la
  // clé de service : il n'y a alors aucun utilisateur à qui demander un rôle.
  // Sans cette porte, l'étiquetage automatique des commandes payées se heurtait
  // à un 401 — les clés `sb_secret_…` n'étant pas des JWT, `getClaims` échoue.
  const isServiceRole = bearer === serviceRoleKey;

  if (!isServiceRole) {
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: authError } = await userClient.auth.getClaims(bearer);
    if (authError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);

    const { data: isAdmin } = await userClient.rpc('has_role', {
      _user_id: claimsData.claims.sub,
      _role: 'admin',
    });
    if (!isAdmin) return json({ error: 'Forbidden: admin role required' }, 403);
  }

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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) return json({ error: orderError.message }, 500);
  if (!order) return json({ error: 'Order not found' }, 404);

  // ─── Une étiquette déjà affranchie n'est JAMAIS refaite ───────────────────
  //
  // Chaque appel à Colissimo déclare un nouveau colis : nouveau numéro de
  // suivi, nouvelle facturation, et l'ancien numéro devient orphelin. Le
  // 18/09/2026 sur HMP-MU6KUKDP, quatre étiquettes ont été émises en 27
  // minutes — dont deux à 11 secondes d'intervalle — et la cliente a reçu
  // quatre e-mails « votre commande est en route », chacun avec un numéro
  // différent. Un seul de ces colis existait vraiment.
  //
  // Cette garde est ici, et pas chez les appelants, parce qu'ils sont cinq :
  // le bouton de l'écran Commandes, l'écran Colissimo (étiquette et impression
  // groupée), le bordereau A4 et l'étiquetage automatique après paiement. Les
  // border un par un, c'est en oublier un au prochain écran ajouté.
  //
  // `order-slip-pdf` appliquait déjà cette règle pour son propre compte
  // (« on réutilise, on ne réaffranchit pas ») : on la généralise.
  //
  // Porte de sortie : `force: true`, réservé à un geste d'administration
  // délibéré. L'écran Colissimo en offre une autre, plus lisible — supprimer le
  // numéro de suivi, ce qui rend la commande à nouveau affranchissable.
  const force = body.force === true;

  if (!force) {
    const existing = await findExistingLabel(admin, orderId, isReturn, order);
    // 409 quand l'étiquette existe mais reste introuvable : c'est un conflit à
    // arbitrer par un humain, pas un succès. 200 quand on rend l'existante.
    if (existing) return json(existing, existing.error ? 409 : 200);
  }

  // Poids total : somme des poids réels des produits (défaut 1500 g par article), minimum 0,2 kg.
  const items = Array.isArray(order.items) ? (order.items as Array<Record<string, unknown>>) : [];
  const DEFAULT_WEIGHT_G = 1500;

  // Poids et SKU sont lus une seule fois, hors du calcul de poids : la
  // déclaration douanière en a besoin article par article, même quand le poids
  // total est imposé par l'appelant.
  const productIds = Array.from(
    new Set(
      items
        .map((it) => String(it.productId ?? it.product_id ?? ''))
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
    ),
  );
  const weights: Record<string, number> = {};
  const skus: Record<string, string> = {};
  if (productIds.length) {
    const { data: prods } = await admin
      .from('products')
      .select('id, weight_grams, sku')
      .in('id', productIds);
    for (const p of prods || []) {
      weights[String(p.id)] = Number(p.weight_grams) > 0 ? Number(p.weight_grams) : DEFAULT_WEIGHT_G;
      if (p.sku) skus[String(p.id)] = String(p.sku);
    }
  }

  let weight = Number(body.weight) || 0;
  if (!weight) {
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
  const customerAddress = String(order.customer_address || '');
  const isRelay = customerAddress.toLowerCase().includes('point relais');

  // Point de retrait : le checkout ne conserve ni l'identifiant ni le type du
  // point choisi, on les relit donc chez La Poste. Même mécanique que
  // colissimo-proxy — la logique vit dans _shared/colissimo.ts.
  let pickupLocationId = String(body.pickup_location_id || '').trim();
  let pickupType = String(body.pickup_location_type || '').trim().toUpperCase();
  let addresseeLine = customerAddress;

  if (isRelay && !isReturn) {
    const resolved = await resolvePickupPoint(customerAddress, login, password);
    if (resolved) {
      if (!pickupLocationId) pickupLocationId = resolved.id;
      if (!pickupType) pickupType = resolved.type;
      // Hors domicile, le destinataire garde son adresse personnelle : c'est
      // pickupLocationId qui désigne le lieu de retrait.
      if (resolved.customerLine) addresseeLine = resolved.customerLine;
    }
    if (!pickupLocationId) {
      return json(
        {
          error: 'Point de retrait introuvable',
          details:
            "Impossible de retrouver ce point chez La Poste à partir de l'adresse enregistrée. " +
            'Vérifiez le point relais de la commande, ou générez une étiquette à domicile.',
        },
        422,
      );
    }
  }

  // Destination réelle de la commande. Jusqu'au 14/09/2026 ce code était figé à
  // 'FR' : une commande suisse partait donc avec un code postal à 4 chiffres
  // déclaré en France, format invalide, et Colissimo rejetait l'étiquette.
  const destinationCountry = normalizeCountryCode(order.customer_country);
  const capability = getCapability(destinationCountry);

  if (!capability) {
    return json(
      {
        error: 'Destination non desservie',
        details:
          `Colissimo ne dessert pas « ${order.customer_country ?? '—'} » depuis la France. ` +
          "Corrigez le pays de la commande, ou expédiez-la depuis l'espace professionnel La Poste.",
      },
      422,
    );
  }

  if (isRelay && !isReturn && !capability.relay) {
    return json(
      {
        error: 'Point relais indisponible dans ce pays',
        details:
          `Le réseau point relais n'existe pas en ${destinationCountry}. ` +
          'Cette commande doit être livrée à domicile : modifiez son adresse avant de générer une étiquette.',
      },
      422,
    );
  }

  // A2P vise les commerces du réseau Pickup ; un bureau de poste est un BPR.
  // Forcer A2P — ce que faisait ce code — fait refuser l'étiquette.
  //
  // À domicile, le code dépend de la destination : beaucoup de pays (DE, ES, IT,
  // GB, US, CA…) n'acceptent que la version avec signature, et les DOM-TOM ont
  // leurs propres codes (COM/CDS). `DOM` en dur ne valait que pour la France, la
  // Suisse et la Belgique.
  const homeProductCode = resolveHomeProductCode(destinationCountry) ?? 'DOM';
  const productCode = isReturn
    ? 'REPA'
    : isRelay
      ? (PICKUP_PRODUCT_CODES.has(pickupType) ? pickupType : 'A2P')
      : homeProductCode;

  // L'expéditeur imprimé vient de l'administration ; les valeurs en dur ne
  // servent plus que de dernier recours. Sans cette lecture, l'étiquette
  // partait au nom d'une adresse parisienne fictive, alors que l'expéditeur
  // réel est configuré dans Admin → Paramètres.
  const { data: senderCfg } = await admin
    .from('admin_config')
    .select(
      'colissimo_sender_name, colissimo_sender_address, colissimo_sender_zip, colissimo_sender_city, ' +
        'colissimo_customs_hs_code, colissimo_customs_origin_country',
    )
    .eq('config_key', 'main')
    .maybeSingle();

  const senderName =
    (body.sender_name as string) || senderCfg?.colissimo_sender_name || 'HELVETICA-MP';
  const senderAddress =
    (body.sender_address as string) || senderCfg?.colissimo_sender_address || '1 Rue de la Paix';
  const senderZip = (body.sender_zip as string) || senderCfg?.colissimo_sender_zip || '75001';
  const senderCity = (body.sender_city as string) || senderCfg?.colissimo_sender_city || 'Paris';

  // Nom sous lequel le destinataire voit l'expédition. Obligatoire hors
  // domicile : « [30018] Le nom commercial n'a pas été transmis ».
  const commercialName = sanitizeAddressLine((body.commercial_name as string) || senderName);

  // --- Déclaration douanière (CN23) ------------------------------------------
  // Obligatoire dès que la table Colissimo l'indique (CH, GB, US, CA, DOM-TOM…).
  // Sans elle, aucune étiquette ne sort pour ces destinations.
  const needsCustoms = !isReturn && requiresCn23(destinationCountry);
  let customsDeclarations: Record<string, unknown> | undefined;

  if (needsCustoms) {
    // Code SH laissé vide par défaut (décision du 14/09/2026) ; il se renseigne
    // en administration sans redéploiement si la douane le réclame.
    const defaultHsCode = String(senderCfg?.colissimo_customs_hs_code || '').trim();
    const defaultOrigin =
      String(senderCfg?.colissimo_customs_origin_country || 'CN').trim().toUpperCase() || 'CN';

    // L'API rejette les accents dans la description et tronque au-delà de 64
    // caractères ; le SKU est limité à 44.
    const deaccent = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, ' ').trim();

    const totalItems = items.reduce((n, it) => n + (Number(it.quantity) || 1), 0) || 1;

    const articles = items.map((it) => {
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.price) || 0;
      const pid = String(it.productId ?? it.product_id ?? '');
      const unitWeightKg = (weights[pid] || DEFAULT_WEIGHT_G) / 1000;

      const article: Record<string, unknown> = {
        description: deaccent(String(it.name || 'Vetement')).slice(0, 64) || 'Vetement',
        quantity: String(qty),
        weight: String(Math.max(0.01, Math.round(unitWeightKg * 1000) / 1000)),
        value: String(Math.round(unitPrice * 100) / 100),
        currency: 'EUR',
        originCountry: defaultOrigin,
        artref: String(it.sku ?? skus[pid] ?? pid ?? '').slice(0, 44),
      };
      // Champ omis plutôt qu'envoyé vide : une chaîne vide est un code SH
      // invalide, une absence est une donnée manquante.
      if (defaultHsCode) article.hsCode = defaultHsCode;
      return article;
    });

    customsDeclarations = {
      includeCustomsDeclarations: true,
      // « Envoi commercial » : c'est une vente, pas un cadeau ni un échantillon.
      contents: { article: articles, category: { value: 3 } },
      // Le poids du colis est déjà déclaré ; on ne le redéclare pas ici.
      importersReference: String(order.order_number || ''),
      importersEmail: String(order.customer_email || ''),
      importersPhone: String(order.customer_phone || ''),
    };

    if (!articles.length) {
      console.error('CN23 demandée mais la commande ne contient aucun article', orderId, totalItems);
    }
  }

  /**
   * Format d'impression de l'étiquette.
   *
   * ── Ce que change le A4 ────────────────────────────────────────────────────
   *
   * `PDF_10x15_300dpi` renvoie la vignette nue. `PDF_A4_300dpi` renvoie la
   * planche A4 paysage : l'étiquette à gauche, entourée de pointillés et des
   * mentions « Collez ici le ruban adhésif », un trait de coupe au milieu
   * (« Étiquette Colissimo, découpez selon les pointillés »), et à droite le
   * panneau « Comment utiliser votre étiquette Colissimo ? ».
   *
   * C'est ce panneau — et non la CN23 — que le client appelait la « notice de
   * découpage ». C'est aussi le format par défaut du plugin officiel
   * (`LabelGenerationPayload.php:74`).
   *
   * ── Appliqué à TOUTES les destinations depuis le 16/09/2026 ───────────────
   *
   * L'essai limité à l'international a été validé par le client, qui a demandé
   * le même format partout. La France repasse donc de la vignette à la planche
   * A4 : c'est l'essentiel du volume, et c'est un changement visible en
   * atelier.
   *
   * ⚠️ Le A4 est un format **bureautique**. Il ne s'imprime pas sur la
   * thermique 10×15 dont le kit Colissimo nous avait été fourni : le jour où
   * cette imprimante reprend du service, il faut revenir au 10×15 — ou rendre
   * ce choix réglable en administration, sur le modèle du code SH. La
   * constante est isolée ici pour que ce retour arrière tienne en une ligne.
   *
   * Rien d'autre dans le code ne dépend du format : aucune feuille de style
   * d'impression, aucun gabarit, aucune dimension codée côté front.
   */
  const labelPrintingType = 'PDF_A4_300dpi';

  // Frais de port de la commande, en centimes — déclarés à la douane.
  const transportationAmount = Math.round(Number(order.shipping_cost || 0) * 100);

  // Colissimo REFUSE une déclaration douanière dont le port vaut zéro (le
  // plugin officiel bloque d'ailleurs l'étiquette dans ce cas). On n'invente
  // pas de montant pour contourner : un chiffre inventé sur un document
  // douanier est pire qu'un refus. Le refus, lui, remonte en 422 avec le motif
  // de Colissimo, et se corrige en renseignant le port sur la commande.
  if (needsCustoms && transportationAmount <= 0) {
    console.error(
      'CN23 demandée avec des frais de port à zéro — Colissimo va refuser',
      orderId,
      String(order.order_number || ''),
    );
  }

  const payload = {
    contractNumber: login,
    password,
    outputFormat: {
      x: 0,
      y: 0,
      outputPrintingType: labelPrintingType,
    },
    letter: {
      service: {
        productCode,
        depositDate: new Date().toISOString().split('T')[0],
        orderNumber: String(order.order_number || ''),
        // `totalAmount` est le PORT, pas le total de la commande.
        //
        // Colissimo imprime ce champ sur la CN23 sous « Frais de port », et le
        // plugin officiel y met `get_shipping_total()` — le port seul
        // (LabelGenerationPayload.php:1004), renseigné à l'identique dans
        // `totalAmount` et `transportationAmount`.
        //
        // Ce code envoyait `order.total`. Sur la commande suisse du 16/09, la
        // CN23 déclarait donc 243,83 € de port pour 169 € de marchandise, alors
        // que le port réel est de 40 €. La douane calcule ses droits sur
        // marchandise + port : le destinataire payait sur 412,83 € au lieu de
        // 209 €, soit près du double. Le défaut ne se voyait pas tant que la
        // CN23 elle-même était perdue à l'enregistrement.
        totalAmount: transportationAmount,
        transportationAmount,
        commercialName,
      },
      // `pickupLocationId` se place dans `parcel`, jamais dans `service` —
      // l'exemple officiel de la documentation REST est formel, et le schéma
      // SOAP dit la même chose.
      parcel: pickupLocationId ? { weight, pickupLocationId } : { weight },
      sender: {
        // « Réf client » imprimée sur l'étiquette — vide jusqu'au 25/09/2026.
        // Même valeur que le module WooCommerce officiel (`senderParcelRef` =
        // numéro de commande) : c'est ce qui permet de rapprocher un colis
        // d'une commande à l'œil, sur le quai comme au retour.
        senderParcelRef: String(order.order_number || ''),
        address: {
          companyName: sanitizeAddressLine(senderName),
          line2: sanitizeAddressLine(senderAddress),
          // L'expéditeur, lui, est bien toujours en France : tous les produits
          // Colissimo partent du territoire français, quelle que soit la
          // destination. Ce 'FR'-ci n'est pas un défaut.
          countryCode: SENDER_COUNTRY,
          city: senderCity,
          zipCode: senderZip,
        },
      },
      addressee: {
        address: {
          lastName,
          firstName,
          line2: sanitizeAddressLine(addresseeLine),
          countryCode: destinationCountry,
          city: String(order.customer_city || ''),
          zipCode: String(order.customer_zip || ''),
          phoneNumber: String(order.customer_phone || ''),
          mobileNumber: String(order.customer_phone || ''),
          email: String(order.customer_email || ''),
        },
      },
      ...(customsDeclarations ? { customsDeclarations } : {}),
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

  // Lu AVANT de consommer le corps : c'est lui qui porte la `boundary`,
  // seule information fiable pour découper une réponse multipart.
  const responseContentType = response.headers.get('content-type');
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

  const pdf = await extractPdf(raw, responseContentType);
  if (!pdf) return json({ error: 'Aucun PDF retourné par Colissimo' }, 502);

  // Le numéro de colis est cherché à trois endroits, car Colissimo ne le place
  // pas toujours au même : `labelV2Response` pour un envoi national, la racine
  // de la réponse à l'international. Ce code n'interrogeait que
  // `labelResponse`, qui n'existe dans aucun des deux cas — le numéro n'était
  // donc jamais lu, et comme il n'est enregistré que s'il est trouvé, la
  // commande gardait `tracking_number` à null alors que son étiquette était
  // bel et bien archivée. C'est ce qui la rendait invisible dans l'écran
  // Colissimo, qui se fie au numéro de suivi.
  const labelBlock = (meta?.labelV2Response ?? meta?.labelResponse ?? {}) as Record<string, unknown>;
  const trackingNumber =
    String(labelBlock.parcelNumber || meta?.parcelNumber || '').trim() || null;
  if (!trackingNumber) {
    // Sans numéro, l'étiquette est inexploitable : le colis circulerait sans
    // suivi possible. Mieux vaut le dire que d'archiver un PDF orphelin.
    console.error('Colissimo: parcelNumber introuvable', JSON.stringify(meta)?.slice(0, 500));
  }

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
    // Un colis étiqueté est prêt à partir : sans ce passage au statut expédié,
    // la commande n'entrait jamais dans l'écran Colissimo ni dans le bordereau
    // de dépôt, qui ne retiennent que les commandes « Shipped » pourvues d'un
    // numéro. On ne touche pas aux statuts plus avancés.
    if (trackingNumber && ['Processing', 'Pending', 'pending', 'processing'].includes(String(order.status))) {
      update.status = 'Shipped';
    }
    await admin.from('orders').update(update).eq('id', orderId);
  }

  return json({
    success: true,
    // Étiquette NEUVE : c'est ce qui autorise l'appelant à notifier la cliente.
    reused: false,
    trackingNumber,
    productCode,
    weight,
    path,
    signedUrl: signed?.signedUrl ?? null,
    pdfBase64: toBase64(pdf),
  });
});
