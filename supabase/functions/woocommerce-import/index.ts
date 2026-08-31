import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class WcServiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function errorResponse(e: any) {
  if (e instanceof WcServiceError) {
    return new Response(
      JSON.stringify({ error: e.message, fallback: true, serviceStatus: e.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  return new Response(
    JSON.stringify({ error: e.message || 'Erreur inconnue' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }
  const { data: roleCheck } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  if (!roleCheck) {
    return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), { status: 403, headers: corsHeaders });
  }

  const body = await req.json();
  const { importProducts, importOrders, importCustomers, importStock, mode } = body;

  // ─── Stored configuration (credentials never leave the server) ─────
  const loadConfig = async () => {
    const { data } = await supabase
      .from('woocommerce_config')
      .select('*')
      .eq('config_key', 'main')
      .maybeSingle();
    return data as any | null;
  };

  if (mode === 'get-config') {
    const cfg = await loadConfig();
    return new Response(
      JSON.stringify({
        store_url: cfg?.store_url || '',
        consumer_key: cfg?.consumer_key || '',
        has_secret: !!cfg?.consumer_secret,
        sync_customers: cfg?.sync_customers ?? true,
        sync_orders: cfg?.sync_orders ?? true,
        sync_stats: cfg?.sync_stats ?? true,
        last_sync_at: cfg?.last_sync_at || null,
        last_sync_status: cfg?.last_sync_status || null,
        store_info: cfg?.store_info || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (mode === 'save-config') {
    const existing = await loadConfig();
    const payload: Record<string, unknown> = {
      config_key: 'main',
      store_url: String(body.storeUrl || existing?.store_url || '').trim().replace(/\/+$/, ''),
      consumer_key: String(body.consumerKey || existing?.consumer_key || '').trim(),
      sync_customers: body.syncCustomers ?? existing?.sync_customers ?? true,
      sync_orders: body.syncOrders ?? existing?.sync_orders ?? true,
      sync_stats: body.syncStats ?? existing?.sync_stats ?? true,
    };
    if (body.consumerSecret) payload.consumer_secret = String(body.consumerSecret).trim();
    const { error } = await supabase.from('woocommerce_config').upsert(payload, { onConflict: 'config_key' });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ saved: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const storedConfig = await loadConfig();
  const storeUrl = body.storeUrl || storedConfig?.store_url;
  const consumerKey = body.consumerKey || storedConfig?.consumer_key;
  const consumerSecret = body.consumerSecret || storedConfig?.consumer_secret;

  if (!storeUrl || !consumerKey || !consumerSecret) {
    return new Response(
      JSON.stringify({ error: 'Identifiants WooCommerce manquants — enregistre l’URL, la clé et le secret dans Admin → WooCommerce.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const startedAt = Date.now();
  const correlationId = crypto.randomUUID();
  let normalizedUrl = String(storeUrl).trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;
  const cleanUrl = normalizedUrl;
  const basicAuth = 'Basic ' + btoa(`${consumerKey}:${consumerSecret}`);
  const authParam = `consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;

  const writeSyncLog = async (
    status: 'success' | 'partial' | 'failed',
    payload: { total: number; succeeded: number; failed: number; message?: string; details?: any },
  ) => {
    try {
      await supabase.from('wp_sync_logs').insert({
        correlation_id: correlationId,
        direction: 'import',
        status,
        total: payload.total,
        succeeded: payload.succeeded,
        failed: payload.failed,
        message: payload.message?.slice(0, 1000) || null,
        details: { ...(payload.details || {}), correlationId, storeUrl: cleanUrl, durationMs: Date.now() - startedAt },
        triggered_by: user.id,
      });
    } catch (e: any) {
      console.error('[wp_sync_logs] insert failed:', e?.message);
    }
  };

  const RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);
  const MAX_ATTEMPTS = 6;
  const REQUEST_TIMEOUT_MS = 30_000;

  // Browser-like UAs to bypass WAF/Cloudflare bot challenges
  const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  ];

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let lastDiagHeaders: Record<string, string> = {};

  const captureHeaders = (res: Response) => {
    const keys = ['server', 'cf-ray', 'cf-mitigated', 'x-sucuri-id', 'x-wp-totalpages', 'retry-after'];
    const out: Record<string, string> = {};
    for (const k of keys) {
      const v = res.headers.get(k);
      if (v) out[k] = v;
    }
    lastDiagHeaders = out;
  };

  // Build URL according to auth strategy:
  //   strategy 'header'  -> URL without auth, send Authorization header
  //   strategy 'query'   -> URL with auth query-string (legacy WP fallback)
  const buildUrl = (path: string, page: number, perPage: number, strategy: 'header' | 'query') => {
    // `path` may already carry its own query-string (e.g. "orders?status=any")
    const [base, extra] = String(path).split('?');
    const parts = [`per_page=${perPage}`, `page=${page}`];
    if (extra) parts.push(extra);
    if (strategy === 'query') parts.push(authParam);
    return `${cleanUrl}/wp-json/wc/v3/${base}?${parts.join('&')}`;
  };

  const doFetch = async (url: string, strategy: 'header' | 'query', uaIdx: number) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = {
        'User-Agent': USER_AGENTS[uaIdx % USER_AGENTS.length],
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      };
      if (strategy === 'header') headers['Authorization'] = basicAuth;
      const res = await fetch(url, { signal: ctrl.signal, headers, redirect: 'follow' });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  };

  // Try multiple auth strategies + UA rotation; retry on transient failures.
  const fetchWithRetry = async (path: string, page = 1, perPage = 50): Promise<Response> => {
    const strategies: Array<'header' | 'query'> = ['header', 'query'];
    let lastErr: any = null;
    let lastRes: Response | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const strategy = strategies[(attempt - 1) % strategies.length];
      const uaIdx = attempt - 1;
      const url = buildUrl(path, page, perPage, strategy);
      try {
        const res = await doFetch(url, strategy, uaIdx);
        captureHeaders(res);
        if (res.ok) return res;
        // 401/403 → wrong creds or strategy: try next strategy without long backoff
        if (res.status === 401 || res.status === 403) {
          await res.body?.cancel().catch(() => {});
          if (attempt === MAX_ATTEMPTS) { lastRes = res; break; }
          console.log(`[wc] ${res.status} on ${strategy}, switching strategy/UA`);
          await sleep(400);
          continue;
        }
        if (!RETRY_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) return res;
        const ra = parseInt(res.headers.get('retry-after') || '0', 10);
        await res.body?.cancel().catch(() => {});
        const backoff = ra > 0
          ? Math.min(ra * 1000, 15_000)
          : Math.min(15_000, Math.pow(2, attempt - 1) * 800 + Math.floor(Math.random() * 600));
        console.log(`[wc-retry] ${res.status} attempt ${attempt}/${MAX_ATTEMPTS} (strategy=${strategy}), waiting ${backoff}ms`);
        await sleep(backoff);
      } catch (err: any) {
        lastErr = err;
        if (attempt === MAX_ATTEMPTS) throw err;
        const backoff = Math.min(15_000, Math.pow(2, attempt - 1) * 800 + Math.floor(Math.random() * 600));
        console.log(`[wc-retry] network err attempt ${attempt}/${MAX_ATTEMPTS}: ${err?.message}, waiting ${backoff}ms`);
        await sleep(backoff);
      }
    }
    if (lastRes) return lastRes;
    throw lastErr ?? new Error('fetchWithRetry: exhausted attempts');
  };

  const formatDiag = () => {
    const parts = Object.entries(lastDiagHeaders).map(([k, v]) => `${k}=${v}`);
    return parts.length ? ` [${parts.join(' • ')}]` : '';
  };

  const wcFetch = async (path: string, page = 1) => {
    const res = await fetchWithRetry(path, page, 50);
    if (!res.ok) {
      const statusCode = res.status;
      const errorText = await res.text().catch(() => '');
      if (statusCode >= 500 || statusCode === 408 || statusCode === 429) {
        throw new WcServiceError(
          `Le serveur WooCommerce ne répond pas (HTTP ${statusCode}) après ${MAX_ATTEMPTS} tentatives en alternant Basic Auth et query-string.${formatDiag()} Vérifie ton hébergeur, ton WAF (Cloudflare / Sucuri / Wordfence) ou réessaie dans quelques minutes.`,
          statusCode,
        );
      }
      if (statusCode === 401 || statusCode === 403) {
        throw new WcServiceError(
          `Authentification refusée (HTTP ${statusCode}).${formatDiag()} Vérifie que la clé API WooCommerce a les permissions "Lecture/Écriture" et qu'elle n'est pas restreinte par IP.`,
          statusCode,
        );
      }
      throw new Error(`Erreur API WooCommerce ${statusCode} pour ${path}: ${errorText.substring(0, 200)}`);
    }
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1');
    const data = await res.json();
    return { data, totalPages };
  };


  const wcFetchAll = async (path: string) => {
    const all: any[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const result = await wcFetch(path, page);
      all.push(...result.data);
      totalPages = result.totalPages;
      page++;
      if (page <= totalPages) await sleep(150); // douceur côté WP
    } while (page <= totalPages);
    return all;
  };

  function mapWcProduct(p: any) {
    const allImages = (p.images || []).map((img: any) => img.src).filter(Boolean);
    const sizeAttr = p.attributes?.find((a: any) =>
      a.name?.toLowerCase().includes('taille') || a.name?.toLowerCase() === 'size'
    );
    const colorAttr = p.attributes?.find((a: any) =>
      a.name?.toLowerCase().includes('couleur') || a.name?.toLowerCase() === 'color'
    );
    const otherAttrs: Record<string, string> = {};
    (p.attributes || []).forEach((a: any) => {
      if (a !== sizeAttr && a !== colorAttr) {
        otherAttrs[a.name] = (a.options || []).join(', ');
      }
    });
    return {
      name: p.name || 'Sans titre',
      sku: p.sku || `wc-${p.id}`,
      price: parseFloat(p.regular_price || p.price || '0'),
      sale_price: p.sale_price ? parseFloat(p.sale_price) : null,
      image: allImages[0] || '',
      images: allImages,
      category: p.categories?.map((c: any) => c.name).join(', ') || 'Divers',
      stock: p.stock_quantity ?? 0,
      description: p.description?.replace(/<[^>]*>/g, '') || null,
      short_description: p.short_description?.replace(/<[^>]*>/g, '') || null,
      is_active: p.status === 'publish',
      sizes: sizeAttr?.options || [],
      colors: colorAttr?.options || [],
      attributes: otherAttrs,
      tags: (p.tags || []).map((t: any) => t.name),
      weight: p.weight || null,
      dimensions: p.dimensions || null,
      wc_id: p.id,
    };
  }

  function mapWcCustomer(c: any) {
    return {
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email,
      email: c.email,
      first_name: c.first_name || null,
      last_name: c.last_name || null,
      phone: c.billing?.phone || null,
      total_spent: parseFloat(c.total_spent || '0'),
      orders_count: c.orders_count || 0,
      wc_id: c.id,
      isDuplicate: false,
    };
  }

  function mapWcOrder(o: any) {
    return {
      order_number: `WC-${o.id}`,
      name: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim(),
      customer_name: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim(),
      customer_email: o.billing?.email || '',
      customer_phone: o.billing?.phone || null,
      customer_address: o.billing?.address_1 || '',
      customer_city: o.billing?.city || '',
      customer_zip: o.billing?.postcode || '',
      customer_country: o.billing?.country || 'FR',
      subtotal: parseFloat(o.subtotal || '0'),
      tax: parseFloat(o.total_tax || '0'),
      shipping_cost: parseFloat(o.shipping_total || '0'),
      total: parseFloat(o.total || '0'),
      status: mapWcStatus(o.status),
      payment_status: o.date_paid ? 'Paid' : 'Pending',
      payment_method: o.payment_method_title || null,
      items: o.line_items?.map((li: any) => ({
        productId: li.product_id?.toString(),
        name: li.name,
        price: parseFloat(li.price || '0'),
        quantity: li.quantity,
      })) || [],
      date_created: o.date_created,
      wc_id: o.id,
      isDuplicate: false,
    };
  }

  // ─── PING (connection test, 1 lightweight call) ───────────────────
  if (mode === 'ping') {
    try {
      const res = await fetchWithRetry('products', 1, 1);
      if (!res.ok) {
        const statusCode = res.status;
        await res.body?.cancel().catch(() => {});
        if (statusCode === 401 || statusCode === 403) {
          throw new WcServiceError(
            `Authentification refusée (HTTP ${statusCode}).${formatDiag()} Vérifie que la clé API a les permissions "Lecture/Écriture".`,
            statusCode,
          );
        }
        throw new WcServiceError(
          `Le serveur WooCommerce ne répond pas (HTTP ${statusCode}) après ${MAX_ATTEMPTS} tentatives.${formatDiag()} Vérifie ton hébergeur ou ton WAF (Cloudflare / Sucuri / Wordfence).`,
          statusCode,
        );
      }
      await res.json().catch(() => null);
      let storeInfo: Record<string, unknown> | null = null;
      try {
        const sys = await wcFetch('system_status', 1);
        const env: any = (sys.data as any)?.environment || {};
        storeInfo = {
          store_name: env.site_title || null,
          store_url: env.site_url || cleanUrl,
          wc_version: env.version || null,
          wp_version: env.wp_version || null,
          currency: (sys.data as any)?.settings?.currency || null,
        };
        await supabase.from('woocommerce_config').upsert(
          { config_key: 'main', store_info: storeInfo },
          { onConflict: 'config_key' },
        );
      } catch (_) { /* system_status optionnel */ }
      return new Response(JSON.stringify({ success: true, diag: lastDiagHeaders, storeInfo }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return errorResponse(e);
    }
  }

  // ─── PREVIEW PRODUCTS ─────────────────────────────────────────────

  if (mode === 'preview') {
    try {
      const wcProducts = await wcFetchAll('products');
      const mapped = wcProducts.map(mapWcProduct);
      const skus = mapped.map((m: any) => m.sku);
      const { data: existingProducts } = await supabase
        .from('products')
        .select('sku, id, name, price, sale_price, image, stock, category, description')
        .in('sku', skus);
      const existingMap = new Map((existingProducts || []).map((p: any) => [p.sku, p]));
      const preview = mapped.map((m: any) => ({
        ...m,
        isDuplicate: existingMap.has(m.sku),
        localProduct: existingMap.get(m.sku) || null,
      }));
      return new Response(JSON.stringify({ products: preview }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return errorResponse(e);
    }
  }

  // ─── PREVIEW CUSTOMERS ────────────────────────────────────────────
  if (mode === 'preview-customers') {
    try {
      const wcCustomers = await wcFetchAll('customers');
      const mapped = wcCustomers.filter((c: any) => c.email).map(mapWcCustomer);
      const emails = mapped.map((m: any) => m.email);
      const { data: existing } = await supabase.from('customers').select('email, id, first_name, last_name, total_spent').in('email', emails);
      const existingMap = new Map((existing || []).map((c: any) => [c.email, c]));
      const preview = mapped.map((m: any) => ({
        ...m,
        isDuplicate: existingMap.has(m.email),
        localProduct: existingMap.get(m.email) || null,
      }));
      return new Response(JSON.stringify({ customers: preview }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return errorResponse(e);
    }
  }

  // ─── PREVIEW ORDERS ───────────────────────────────────────────────
  if (mode === 'preview-orders') {
    try {
      const wcOrders = await wcFetchAll('orders');
      const mapped = wcOrders.map(mapWcOrder);
      const orderNumbers = mapped.map((m: any) => m.order_number);
      const { data: existing } = await supabase.from('orders').select('order_number, id, customer_name, total, status').in('order_number', orderNumbers);
      const existingMap = new Map((existing || []).map((o: any) => [o.order_number, o]));
      const preview = mapped.map((m: any) => ({
        ...m,
        isDuplicate: existingMap.has(m.order_number),
        localProduct: existingMap.get(m.order_number) || null,
      }));
      return new Response(JSON.stringify({ orders: preview }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return errorResponse(e);
    }
  }

  // ─── PREVIEW STOCK ────────────────────────────────────────────────
  if (mode === 'preview-stock') {
    try {
      const wcProducts = await wcFetchAll('products');
      const mapped = wcProducts.map((p: any) => ({
        name: p.name || 'Sans titre',
        sku: p.sku || `wc-${p.id}`,
        stock: p.stock_quantity ?? 0,
        manage_stock: p.manage_stock,
        image: (p.images || [])[0]?.src || '',
        wc_id: p.id,
        isDuplicate: false,
      }));
      const skus = mapped.map((m: any) => m.sku);
      const { data: existing } = await supabase.from('products').select('sku, stock, name').in('sku', skus);
      const existingMap = new Map((existing || []).map((p: any) => [p.sku, p]));
      const preview = mapped.map((m: any) => ({
        ...m,
        isDuplicate: existingMap.has(m.sku),
        localProduct: existingMap.get(m.sku) || null,
      }));
      return new Response(JSON.stringify({ stock: preview }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return errorResponse(e);
    }
  }

  // ─── SYNC : CLIENTS + COMMANDES + STATISTIQUES (produits exclus) ───
  const IN_PROGRESS = new Set(['Pending', 'Processing', 'On Hold']);

  const mapOrderRow = (o: any) => {
    const ship = o.shipping || {};
    const bill = o.billing || {};
    const hasShip = !!(ship.address_1 || ship.city);
    return {
      order_number: `WC-${o.number || o.id}`,
      customer_name: `${bill.first_name || ship.first_name || ''} ${bill.last_name || ship.last_name || ''}`.trim() || 'Client WooCommerce',
      customer_email: bill.email || '',
      customer_phone: bill.phone || null,
      customer_address: (hasShip ? [ship.address_1, ship.address_2] : [bill.address_1, bill.address_2]).filter(Boolean).join(' '),
      customer_city: (hasShip ? ship.city : bill.city) || '',
      customer_zip: (hasShip ? ship.postcode : bill.postcode) || '',
      customer_country: (hasShip ? ship.country : bill.country) || 'FR',
      subtotal: (o.line_items || []).reduce((s: number, li: any) => s + parseFloat(li.subtotal || '0'), 0),
      tax: parseFloat(o.total_tax || '0'),
      shipping_cost: parseFloat(o.shipping_total || '0'),
      total: parseFloat(o.total || '0'),
      status: mapWcStatus(o.status),
      payment_status: o.date_paid ? 'Paid' : (o.status === 'refunded' ? 'Refunded' : 'Pending'),
      payment_method: o.payment_method_title || o.payment_method || null,
      notes: [o.customer_note, o.coupon_lines?.length ? `Codes promo : ${o.coupon_lines.map((c: any) => c.code).join(', ')}` : null]
        .filter(Boolean).join(' — ') || null,
      items: (o.line_items || []).map((li: any) => ({
        productId: li.product_id?.toString(),
        sku: li.sku || null,
        name: li.name,
        price: parseFloat(li.price || '0'),
        quantity: li.quantity,
        total: parseFloat(li.total || '0'),
      })),
      wc_id: o.id,
      source: 'woocommerce',
      wc_created_at: o.date_created_gmt ? `${o.date_created_gmt}Z` : (o.date_created || null),
    };
  };

  const mapCustomerRow = (c: any) => ({
    email: String(c.email).toLowerCase(),
    first_name: c.first_name || c.billing?.first_name || null,
    last_name: c.last_name || c.billing?.last_name || null,
    phone: c.billing?.phone || null,
    address: [c.shipping?.address_1 || c.billing?.address_1, c.shipping?.address_2 || c.billing?.address_2].filter(Boolean).join(' ') || null,
    city: c.shipping?.city || c.billing?.city || null,
    zip: c.shipping?.postcode || c.billing?.postcode || null,
    country: c.shipping?.country || c.billing?.country || null,
    total_spent: parseFloat(c.total_spent || '0'),
    orders_count: c.orders_count || 0,
    wc_id: c.id,
    source: 'woocommerce',
    wc_created_at: c.date_created_gmt ? `${c.date_created_gmt}Z` : (c.date_created || null),
  });

  const fetchStats = async () => {
    const period = String(body.statsPeriod || 'month');
    const reports: Array<{ report: string; path: string }> = [
      { report: 'sales', path: `reports/sales?period=${period}` },
      { report: 'orders_totals', path: 'reports/orders/totals' },
      { report: 'customers_totals', path: 'reports/customers/totals' },
      { report: 'coupons_totals', path: 'reports/coupons/totals' },
      { report: 'top_sellers', path: `reports/top_sellers?period=${period}` },
    ];
    const collected: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const r of reports) {
      try {
        const { data } = await wcFetch(r.path, 1);
        collected[r.report] = data;
        await supabase.from('woocommerce_stats').upsert(
          { report: r.report, period, data: { value: data }, fetched_at: new Date().toISOString() },
          { onConflict: 'report,period' },
        );
      } catch (e: any) {
        errors.push(`Statistiques ${r.report}: ${e.message}`);
      }
      await sleep(120);
    }
    return { period, collected, errors };
  };

  if (mode === 'stats') {
    try {
      const { period, collected, errors } = await fetchStats();
      return new Response(JSON.stringify({ period, stats: collected, errors }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return errorResponse(e);
    }
  }

  if (mode === 'sync') {
    const syncCustomers = body.syncCustomers ?? storedConfig?.sync_customers ?? true;
    const syncOrders = body.syncOrders ?? storedConfig?.sync_orders ?? true;
    const syncStats = body.syncStats ?? storedConfig?.sync_stats ?? true;
    const incremental = !!body.incremental && !!storedConfig?.last_sync_at;
    const since = incremental ? new Date(storedConfig.last_sync_at).toISOString().replace(/\.\d+Z$/, '') : null;
    const out: {
      customers: number; orders: number; ordersInProgress: number;
      stats: string[]; errors: string[]; incremental: boolean; since: string | null;
    } = { customers: 0, orders: 0, ordersInProgress: 0, stats: [], errors: [], incremental, since };

    if (syncCustomers) {
      try {
        const path = since ? `customers?role=all&orderby=id&order=asc&modified_after=${encodeURIComponent(since)}` : 'customers?role=all&orderby=id&order=asc';
        const wcCustomers = await wcFetchAll(path);
        for (const c of wcCustomers) {
          if (!c.email) continue;
          const { error } = await supabase.from('customers').upsert(mapCustomerRow(c), { onConflict: 'email' });
          if (error) out.errors.push(`Client ${c.email}: ${error.message}`);
          else out.customers++;
        }
      } catch (e: any) {
        out.errors.push(`Clients: ${e.message}`);
      }
    }

    if (syncOrders) {
      try {
        const path = since
          ? `orders?status=any&orderby=date&order=desc&modified_after=${encodeURIComponent(since)}`
          : 'orders?status=any&orderby=date&order=desc';
        const wcOrders = await wcFetchAll(path);
        for (const o of wcOrders) {
          const row = mapOrderRow(o);
          if (IN_PROGRESS.has(row.status)) out.ordersInProgress++;
          const { error } = await supabase.from('orders').upsert(row, { onConflict: 'order_number' });
          if (error) out.errors.push(`Commande ${row.order_number}: ${error.message}`);
          else out.orders++;
        }
      } catch (e: any) {
        out.errors.push(`Commandes: ${e.message}`);
      }
    }

    if (syncStats) {
      try {
        const { collected, errors } = await fetchStats();
        out.stats = Object.keys(collected);
        out.errors.push(...errors);
      } catch (e: any) {
        out.errors.push(`Statistiques: ${e.message}`);
      }
    }

    const done = out.customers + out.orders + out.stats.length;
    const syncStatus: 'success' | 'partial' | 'failed' =
      out.errors.length === 0 ? 'success' : done > 0 ? 'partial' : 'failed';
    await writeSyncLog(syncStatus, {
      total: done + out.errors.length,
      succeeded: done,
      failed: out.errors.length,
      message: syncStatus === 'success'
        ? `Sync OK — ${out.customers} client(s), ${out.orders} commande(s), ${out.stats.length} rapport(s)`
        : out.errors[0],
      details: { ...out, mode: 'sync' },
    });
    await supabase.from('woocommerce_config').upsert(
      { config_key: 'main', last_sync_at: new Date().toISOString(), last_sync_status: syncStatus },
      { onConflict: 'config_key' },
    );

    return new Response(JSON.stringify({ ...out, status: syncStatus, correlationId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  // ─── IMPORT MODE ──────────────────────────────────────────────────
  const result: { products?: number; orders?: number; customers?: number; stock?: number; errors: string[] } = { errors: [] };

  if (importProducts) {
    try {
      const selectedSkus: string[] | undefined = body.selectedSkus;
      const wcProducts = await wcFetchAll('products');
      let mapped = wcProducts.map(mapWcProduct);
      if (selectedSkus && selectedSkus.length > 0) {
        mapped = mapped.filter((m: any) => selectedSkus.includes(m.sku));
      }
      let count = 0;
      for (const product of mapped) {
        const dbProduct = {
          name: product.name, sku: product.sku, price: product.price,
          sale_price: product.sale_price, image: product.image,
          category: product.category, stock: product.stock,
          description: product.description, is_active: product.is_active,
          sizes: product.sizes, colors: product.colors,
          attributes: product.attributes, tags: product.tags,
        };
        const { error } = await supabase.from('products').upsert(dbProduct, { onConflict: 'sku' });
        if (error) result.errors.push(`Produit ${product.name}: ${error.message}`);
        else count++;
      }
      result.products = count;
    } catch (e: any) {
      result.errors.push(`Produits: ${e.message}`);
    }
  }

  if (importOrders) {
    try {
      const wcOrders = await wcFetchAll('orders');
      let count = 0;
      for (const o of wcOrders) {
        const mapped = mapWcOrder(o);
        const payload = {
          order_number: mapped.order_number,
          customer_name: mapped.customer_name,
          customer_email: mapped.customer_email,
          customer_phone: mapped.customer_phone,
          customer_address: mapped.customer_address,
          customer_city: mapped.customer_city,
          customer_zip: mapped.customer_zip,
          customer_country: mapped.customer_country,
          subtotal: mapped.subtotal,
          tax: mapped.tax,
          shipping_cost: mapped.shipping_cost,
          total: mapped.total,
          status: mapped.status,
          payment_status: mapped.payment_status,
          payment_method: mapped.payment_method,
          items: mapped.items,
        };
        const { error } = await supabase.from('orders').upsert(payload, { onConflict: 'order_number' });
        if (error) result.errors.push(`Commande ${mapped.order_number}: ${error.message}`);
        else count++;
      }
      result.orders = count;
    } catch (e: any) {
      result.errors.push(`Commandes: ${e.message}`);
    }
  }

  if (importCustomers) {
    try {
      const wcCustomers = await wcFetchAll('customers');
      let count = 0;
      for (const c of wcCustomers) {
        if (!c.email) continue;
        const fakeUserId = `00000000-0000-0000-${String(c.id).padStart(4, '0')}-000000000000`;
        const payload = {
          email: c.email,
          first_name: c.first_name || null,
          last_name: c.last_name || null,
          phone: c.billing?.phone || null,
          user_id: fakeUserId,
          total_spent: parseFloat(c.total_spent || '0'),
        };
        const { error } = await supabase.from('customers').upsert(payload, { onConflict: 'email' });
        if (error) result.errors.push(`Client ${c.email}: ${error.message}`);
        else count++;
      }
      result.customers = count;
    } catch (e: any) {
      result.errors.push(`Clients: ${e.message}`);
    }
  }

  if (importStock) {
    try {
      const wcProducts = await wcFetchAll('products');
      let count = 0;
      for (const p of wcProducts) {
        const sku = p.sku || `wc-${p.id}`;
        const qty = p.stock_quantity ?? 0;
        const { error } = await supabase.from('products').update({ stock: qty }).eq('sku', sku);
        if (error) result.errors.push(`Stock ${sku}: ${error.message}`);
        else count++;
      }
      result.stock = count;
    } catch (e: any) {
      result.errors.push(`Stocks: ${e.message}`);
    }
  }

  const totals = (result.products || 0) + (result.orders || 0) + (result.customers || 0) + (result.stock || 0);
  const failedCount = result.errors.length;
  const status: 'success' | 'partial' | 'failed' = failedCount === 0
    ? 'success'
    : totals > 0 ? 'partial' : 'failed';
  await writeSyncLog(status, {
    total: totals + failedCount,
    succeeded: totals,
    failed: failedCount,
    message: status === 'success'
      ? `Import OK (${totals} entrées)`
      : result.errors[0] || 'Import terminé avec erreurs',
    details: {
      products: result.products,
      orders: result.orders,
      customers: result.customers,
      stock: result.stock,
      errors: result.errors,
      flags: { importProducts: !!importProducts, importOrders: !!importOrders, importCustomers: !!importCustomers, importStock: !!importStock },
    },
  });

  return new Response(JSON.stringify({ ...result, correlationId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

function mapWcStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending', processing: 'Processing', 'on-hold': 'On Hold',
    completed: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded', failed: 'Cancelled',
  };
  return map[status] || 'Pending';
}
