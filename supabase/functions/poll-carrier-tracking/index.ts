import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface TrackingEvent {
  status_code: string;
  label: string;
  location?: string | null;
  event_at: string;
}

/** Codes qui déclenchent une notification e-mail au client. */
const NOTIFY_CODES = new Set(['taken_in_charge', 'in_transit', 'out_for_delivery', 'delivered', 'exception']);

function normalizeCode(raw: string): string {
  const s = (raw || '').toLowerCase();
  if (s.includes('livr') && !s.includes('en cours')) return 'delivered';
  if (s.includes('distribution') || s.includes('out for delivery') || s.includes('en cours de livraison')) {
    return 'out_for_delivery';
  }
  if (s.includes('pris en charge') || s.includes('accepted') || s.includes('depose')) return 'taken_in_charge';
  if (s.includes('incident') || s.includes('anomalie') || s.includes('exception') || s.includes('retour')) {
    return 'exception';
  }
  return 'in_transit';
}

/**
 * Suivi La Poste / Colissimo.
 * La clé « Suivi v2 » est lue en base (saisie dans l'admin) ou dans le secret LAPOSTE_TRACKING_API_KEY.
 * Sans clé, la fonction renvoie une liste vide (mode dégradé) sans échouer.
 */
async function fetchLaPosteEvents(tracking: string, key: string | null): Promise<TrackingEvent[]> {
  if (!key) return [];


  const res = await fetch(
    `https://api.laposte.fr/suivi/v2/idships/${encodeURIComponent(tracking)}?lang=fr_FR`,
    { headers: { 'X-Okapi-Key': key, Accept: 'application/json' } },
  );
  const text = await res.text();
  if (!res.ok) {
    console.error(`La Poste tracking [${res.status}]: ${text.slice(0, 500)}`);
    return [];
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(text);
  } catch {
    return [];
  }

  const shipment = (payload as { shipment?: Record<string, unknown> }).shipment;
  const timeline = (shipment?.event as Array<Record<string, unknown>> | undefined) || [];

  return timeline
    .map((e) => {
      const label = String(e.label ?? e.code ?? '').trim();
      const at = String(e.date ?? '');
      if (!label || !at) return null;
      return {
        status_code: normalizeCode(`${e.code ?? ''} ${label}`),
        label,
        location: (e.site as string) ?? null,
        event_at: new Date(at).toISOString(),
      } as TrackingEvent;
    })
    .filter((e): e is TrackingEvent => e !== null);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const singleOrderId = String((body as { order_id?: string })?.order_id || '').trim();

    let query = admin
      .from('orders')
      .select('id, order_number, status, tracking_number, shipping_carrier, customer_email')
      .not('tracking_number', 'is', null);

    if (singleOrderId) {
      query = query.eq('id', singleOrderId);
    } else {
      query = query.in('status', ['Shipped', 'Processing']).limit(80);
    }

    const { data: orders, error } = await query;
    if (error) return json({ error: error.message }, 400);

    const report: Array<Record<string, unknown>> = [];

    const { data: keyRow } = await admin
      .from('payment_gateway_secrets')
      .select('secret_key')
      .eq('gateway', 'laposte_tracking')
      .maybeSingle();
    const apiKey = keyRow?.secret_key || Deno.env.get('LAPOSTE_TRACKING_API_KEY') || null;
    const noKey = !apiKey;

    for (const order of orders || []) {
      const tracking = String(order.tracking_number || '').trim();
      if (!tracking) continue;

      const events = await fetchLaPosteEvents(tracking, apiKey);

      if (events.length === 0) {
        report.push({ order: order.order_number, events: 0, degraded: noKey });
        continue;
      }

      // Insertion idempotente (index unique order_id + status_code + event_at)
      const rows = events.map((e) => ({
        order_id: order.id,
        status_code: e.status_code,
        label: e.label,
        location: e.location,
        carrier: order.shipping_carrier || 'Colissimo',
        event_at: e.event_at,
      }));

      const { data: inserted, error: insErr } = await admin
        .from('order_tracking_events')
        .upsert(rows, { onConflict: 'order_id,status_code,event_at', ignoreDuplicates: true })
        .select('id, status_code, label, event_at, notified_at');

      if (insErr) {
        console.error('insert tracking events', insErr.message);
        continue;
      }

      const fresh = (inserted || []).filter((r) => !r.notified_at);

      // Statut de commande dérivé du dernier événement
      const latest = [...events].sort((a, b) => b.event_at.localeCompare(a.event_at))[0];
      if (latest?.status_code === 'delivered' && order.status !== 'Delivered') {
        await admin.from('orders').update({ status: 'Delivered' }).eq('id', order.id);
      }

      // Notification e-mail (un seul e-mail par nouvel événement notable)
      for (const ev of fresh) {
        if (!NOTIFY_CODES.has(ev.status_code)) continue;
        if (!order.customer_email) continue;

        const { error: mailErr } = await admin.functions.invoke('send-order-status-email', {
          body: {
            order_id: order.id,
            type: 'tracking_update',
            event: { status_code: ev.status_code, label: ev.label, event_at: ev.event_at },
          },
        });
        if (mailErr) console.error('send-order-status-email', mailErr.message);

        await admin
          .from('order_tracking_events')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', ev.id);
      }

      report.push({ order: order.order_number, events: events.length, notified: fresh.length });
    }

    return json({ ok: true, degraded: noKey, checked: (orders || []).length, report });
  } catch (e) {
    console.error('poll-carrier-tracking error', e);
    return json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, 500);
  }
});
