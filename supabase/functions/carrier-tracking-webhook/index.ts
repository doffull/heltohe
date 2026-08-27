import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

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

interface RawEvent {
  code?: string;
  status?: string;
  label?: string;
  message?: string;
  site?: string;
  location?: string;
  date?: string;
  event_at?: string;
  timestamp?: string;
}

function pickEvents(payload: Record<string, unknown>): RawEvent[] {
  const candidates =
    (payload.events as RawEvent[]) ||
    (payload.event as RawEvent[]) ||
    ((payload.shipment as { event?: RawEvent[] })?.event as RawEvent[]) ||
    null;
  if (Array.isArray(candidates)) return candidates;
  // Événement unique à plat
  if (payload.label || payload.status || payload.code || payload.message) return [payload as RawEvent];
  return [];
}

function pickTracking(payload: Record<string, unknown>): string {
  const shipment = payload.shipment as Record<string, unknown> | undefined;
  return String(
    payload.trackingNumber ??
      payload.tracking_number ??
      payload.idShip ??
      payload.parcelNumber ??
      payload.numeroColis ??
      shipment?.idShip ??
      '',
  ).trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const url = new URL(req.url);
    const provided =
      url.searchParams.get('token') ||
      req.headers.get('x-webhook-token') ||
      (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });

    const { data: secretRow } = await admin
      .from('payment_gateway_secrets')
      .select('secret_key')
      .eq('gateway', 'carrier_webhook')
      .maybeSingle();

    const expected = secretRow?.secret_key || Deno.env.get('CARRIER_WEBHOOK_TOKEN');
    if (!expected) return json({ error: 'Webhook non configuré' }, 503);
    if (!provided || provided !== expected) return json({ error: 'Unauthorized' }, 401);

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const tracking = pickTracking(payload);
    if (!tracking) return json({ error: 'Numéro de suivi manquant' }, 400);

    const { data: order } = await admin
      .from('orders')
      .select('id, order_number, status, tracking_number, shipping_carrier, customer_email')
      .eq('tracking_number', tracking)
      .maybeSingle();
    if (!order) return json({ error: 'Commande introuvable pour ce numéro de suivi' }, 404);

    const rawEvents = pickEvents(payload);
    if (rawEvents.length === 0) return json({ error: 'Aucun événement dans la charge utile' }, 400);

    const rows = rawEvents
      .map((e) => {
        const label = String(e.label ?? e.message ?? e.status ?? e.code ?? '').trim();
        const at = String(e.event_at ?? e.date ?? e.timestamp ?? new Date().toISOString());
        if (!label) return null;
        const when = new Date(at);
        if (Number.isNaN(when.getTime())) return null;
        return {
          order_id: order.id,
          status_code: normalizeCode(`${e.code ?? e.status ?? ''} ${label}`),
          label,
          location: e.location ?? e.site ?? null,
          carrier: order.shipping_carrier || 'Colissimo',
          event_at: when.toISOString(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) return json({ error: 'Événements illisibles' }, 400);

    const { data: inserted, error: insErr } = await admin
      .from('order_tracking_events')
      .upsert(rows, { onConflict: 'order_id,status_code,event_at', ignoreDuplicates: true })
      .select('id, status_code, label, event_at, notified_at');
    if (insErr) return json({ error: insErr.message }, 500);

    const fresh = (inserted || []).filter((r) => !r.notified_at);

    const latest = [...rows].sort((a, b) => b.event_at.localeCompare(a.event_at))[0];
    if (latest?.status_code === 'delivered' && order.status !== 'Delivered') {
      await admin.from('orders').update({ status: 'Delivered' }).eq('id', order.id);
    }

    for (const ev of fresh) {
      if (!NOTIFY_CODES.has(ev.status_code) || !order.customer_email) continue;
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

    return json({ ok: true, order: order.order_number, received: rows.length, notified: fresh.length });
  } catch (e) {
    console.error('carrier-tracking-webhook', e);
    return json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, 500);
  }
});
