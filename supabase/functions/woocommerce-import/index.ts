import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  const { storeUrl, consumerKey, consumerSecret, importProducts, importOrders, importCustomers, importStock, mode } = body;

  if (!storeUrl || !consumerKey || !consumerSecret) {
    return new Response(JSON.stringify({ error: 'Missing credentials' }), { status: 400, headers: corsHeaders });
  }

  const cleanUrl = storeUrl.replace(/\/+$/, '');
  const authParam = `consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;

  const wcFetch = async (path: string, page = 1) => {
    const res = await fetch(`${cleanUrl}/wp-json/wc/v3/${path}?per_page=100&page=${page}&${authParam}`);
    if (!res.ok) {
      const statusCode = res.status;
      const errorText = await res.text().catch(() => '');
      if (statusCode >= 500) {
        throw new WcServiceError(`Le serveur WooCommerce est temporairement indisponible (erreur ${statusCode}). Réessayez dans quelques instants.`, statusCode);
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
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
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

  return new Response(JSON.stringify(result), {
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
