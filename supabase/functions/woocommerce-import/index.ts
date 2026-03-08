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

  // Validate admin
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData } = await anonClient.auth.getClaims(token);
  if (!claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }
  const userId = claimsData.claims.sub;
  const { data: roleCheck } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  if (!roleCheck) {
    return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), { status: 403, headers: corsHeaders });
  }

  const body = await req.json();
  const { storeUrl, consumerKey, consumerSecret, importProducts, importOrders, importCustomers } = body;

  if (!storeUrl || !consumerKey || !consumerSecret) {
    return new Response(JSON.stringify({ error: 'Missing credentials' }), { status: 400, headers: corsHeaders });
  }

  const authParam = `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
  const wcFetch = async (path: string) => {
    const res = await fetch(`${storeUrl}/wp-json/wc/v3/${path}?per_page=100&${authParam}`);
    if (!res.ok) throw new Error(`WC API error ${res.status} for ${path}`);
    return res.json();
  };

  const result: { products?: number; orders?: number; customers?: number; errors: string[] } = { errors: [] };

  // ─── Import Products ──────────────────────────────────────────────
  if (importProducts) {
    try {
      const wcProducts = await wcFetch('products');
      const mapped = wcProducts.map((p: any) => ({
        name: p.name || 'Sans titre',
        sku: p.sku || `wc-${p.id}`,
        price: parseFloat(p.regular_price || p.price || '0'),
        sale_price: p.sale_price ? parseFloat(p.sale_price) : null,
        image: p.images?.[0]?.src || '',
        category: p.categories?.[0]?.name || 'Divers',
        stock: p.stock_quantity ?? 0,
        description: p.description?.replace(/<[^>]*>/g, '') || null,
        is_active: p.status === 'publish',
        sizes: p.attributes?.find((a: any) => a.name?.toLowerCase().includes('taille'))?.options || [],
        colors: p.attributes?.find((a: any) => a.name?.toLowerCase().includes('couleur'))?.options || [],
      }));

      let count = 0;
      for (const product of mapped) {
        const { error } = await supabase.from('products').upsert(product, { onConflict: 'sku' });
        if (error) result.errors.push(`Produit ${product.name}: ${error.message}`);
        else count++;
      }
      result.products = count;
    } catch (e: any) {
      result.errors.push(`Produits: ${e.message}`);
    }
  }

  // ─── Import Orders ────────────────────────────────────────────────
  if (importOrders) {
    try {
      const wcOrders = await wcFetch('orders');
      let count = 0;
      for (const o of wcOrders) {
        const orderNumber = `WC-${o.id}`;
        const payload = {
          order_number: orderNumber,
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
          payment_status: o.payment_method ? 'Paid' : 'Pending',
          payment_method: o.payment_method_title || null,
          items: o.line_items?.map((li: any) => ({
            productId: li.product_id?.toString(),
            name: li.name,
            price: parseFloat(li.price || '0'),
            quantity: li.quantity,
          })) || [],
        };
        const { error } = await supabase.from('orders').upsert(payload, { onConflict: 'order_number' });
        if (error) result.errors.push(`Commande WC-${o.id}: ${error.message}`);
        else count++;
      }
      result.orders = count;
    } catch (e: any) {
      result.errors.push(`Commandes: ${e.message}`);
    }
  }

  // ─── Import Customers ─────────────────────────────────────────────
  if (importCustomers) {
    try {
      const wcCustomers = await wcFetch('customers');
      let count = 0;
      for (const c of wcCustomers) {
        if (!c.email) continue;
        // Use a stable UUID derived from email (we can't link to auth.users without a sign-up, so we use a placeholder user_id)
        // We store customers with a deterministic UUID based on WC id
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

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

function mapWcStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    'on-hold': 'On Hold',
    completed: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    failed: 'Cancelled',
  };
  return map[status] || 'Pending';
}
