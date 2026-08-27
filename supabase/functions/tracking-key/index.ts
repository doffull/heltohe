import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const KEY_ROW = 'laposte_tracking';
const WEBHOOK_ROW = 'carrier_webhook';

/** Valide la clé auprès de l'API Suivi v2 de La Poste. */
async function validateKey(key: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://api.laposte.fr/suivi/v2/idships/6A00000000000?lang=fr_FR', {
    headers: { 'X-Okapi-Key': key, Accept: 'application/json' },
  });
  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: 'Clé refusée par La Poste (401/403). Vérifiez la clé Okapi « Suivi v2 ».' };
  }
  if (res.status === 429) {
    return { ok: true, message: 'Clé acceptée (quota momentanément atteint).' };
  }
  if (res.status >= 500) {
    return { ok: false, message: `Service La Poste indisponible (${res.status}). Réessayez.` };
  }
  // 200 ou 404 (colis inconnu) => la clé est valide
  return { ok: true, message: 'Clé valide — le suivi automatique est opérationnel.' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);

    const userId = claimsData.claims.sub as string;
    const { data: isAdmin } = await userClient.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Forbidden: admin role required' }, 403);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = String((body as { action?: string }).action || 'status');

    if (action === 'status') {
      const { data, error } = await admin
        .from('payment_gateway_secrets')
        .select('gateway, last4, updated_at')
        .in('gateway', [KEY_ROW, WEBHOOK_ROW]);
      if (error) return json({ error: error.message }, 500);
      const row = (data || []).find((r) => r.gateway === KEY_ROW);
      const hook = (data || []).find((r) => r.gateway === WEBHOOK_ROW);
      return json({
        configured: !!row || !!Deno.env.get('LAPOSTE_TRACKING_API_KEY'),
        source: row ? 'database' : Deno.env.get('LAPOSTE_TRACKING_API_KEY') ? 'env' : null,
        last4: row?.last4 ?? null,
        updatedAt: row?.updated_at ?? null,
        webhookConfigured: !!hook,
        webhookUpdatedAt: hook?.updated_at ?? null,
      });
    }

    if (action === 'set') {
      const key = String((body as { apiKey?: string }).apiKey || '').trim();
      if (key.length < 10 || key.length > 512) {
        return json({ error: 'Clé invalide (10 à 512 caractères).' }, 400);
      }
      const check = await validateKey(key);
      if (!check.ok) return json({ error: check.message }, 400);

      const { error } = await admin.from('payment_gateway_secrets').upsert(
        {
          gateway: KEY_ROW,
          secret_key: key,
          last4: key.slice(-4),
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
        { onConflict: 'gateway' },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, last4: key.slice(-4), message: check.message });
    }

    if (action === 'test') {
      const { data } = await admin
        .from('payment_gateway_secrets')
        .select('secret_key')
        .eq('gateway', KEY_ROW)
        .maybeSingle();
      const key = data?.secret_key || Deno.env.get('LAPOSTE_TRACKING_API_KEY');
      if (!key) return json({ error: 'Aucune clé de suivi enregistrée.' }, 400);
      const check = await validateKey(key);
      return json(check.ok ? { ok: true, message: check.message } : { error: check.message }, check.ok ? 200 : 400);
    }

    if (action === 'delete') {
      const { error } = await admin.from('payment_gateway_secrets').delete().eq('gateway', KEY_ROW);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === 'rotate_webhook') {
      const secret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const { error } = await admin.from('payment_gateway_secrets').upsert(
        {
          gateway: WEBHOOK_ROW,
          secret_key: secret,
          last4: secret.slice(-4),
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
        { onConflict: 'gateway' },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, token: secret });
    }

    if (action === 'reveal_webhook') {
      const { data } = await admin
        .from('payment_gateway_secrets')
        .select('secret_key')
        .eq('gateway', WEBHOOK_ROW)
        .maybeSingle();
      if (!data?.secret_key) return json({ error: 'Aucun jeton webhook généré.' }, 404);
      return json({ ok: true, token: data.secret_key });
    }

    if (action === 'poll_now') {
      const { data, error } = await admin.functions.invoke('poll-carrier-tracking', { body: {} });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, result: data });
    }

    return json({ error: 'Action inconnue' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 500);
  }
});
