// Gestion admin de la clé Gemini + tests de configuration IA (chat / vocal / textes / vision)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ROW = 'gemini_api';
const GOOGLE_OAI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

/** Envoie un mini prompt pour vérifier clé + modèle. */
async function probe(model: string, key: string | null): Promise<{ ok: boolean; message: string; via: string }> {
  const messages = [{ role: 'user', content: 'Réponds uniquement par: OK' }];

  if (key && model.startsWith('google/')) {
    const res = await fetch(GOOGLE_OAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model.replace(/^google\//, ''), messages }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const txt = String(data?.choices?.[0]?.message?.content || '').trim().slice(0, 60);
      return { ok: true, message: `Clé Gemini valide, modèle « ${model} » opérationnel. Réponse : ${txt || 'OK'}`, via: 'gemini' };
    }
    const text = (await res.text()).slice(0, 300);
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'Clé Gemini refusée par Google (401/403). Vérifiez la clé.', via: 'gemini' };
    }
    if (res.status === 404 || res.status === 400) {
      return { ok: false, message: `Modèle « ${model} » indisponible avec cette clé Gemini (${res.status}). ${text}`, via: 'gemini' };
    }
    return { ok: false, message: `Erreur Google (${res.status}). ${text}`, via: 'gemini' };
  }

  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) return { ok: false, message: 'Aucune clé IA disponible.', via: 'gateway' };
  const res = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
  });
  if (res.ok) {
    const data = await res.json().catch(() => null);
    const txt = String(data?.choices?.[0]?.message?.content || '').trim().slice(0, 60);
    return { ok: true, message: `Passerelle IA intégrée OK, modèle « ${model} ». Réponse : ${txt || 'OK'}`, via: 'gateway' };
  }
  const text = (await res.text()).slice(0, 300);
  if (res.status === 429) return { ok: false, message: 'Trop de requêtes IA, réessayez dans un instant.', via: 'gateway' };
  if (res.status === 402) return { ok: false, message: 'Crédits IA épuisés.', via: 'gateway' };
  return { ok: false, message: `Modèle refusé (${res.status}). ${text}`, via: 'gateway' };
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

    const readKey = async (): Promise<string | null> => {
      const { data } = await admin
        .from('payment_gateway_secrets')
        .select('secret_key')
        .eq('gateway', ROW)
        .maybeSingle();
      return data?.secret_key || Deno.env.get('GEMINI_API_KEY') || null;
    };

    if (action === 'status') {
      const { data } = await admin
        .from('payment_gateway_secrets')
        .select('last4, updated_at')
        .eq('gateway', ROW)
        .maybeSingle();
      return json({
        configured: !!data || !!Deno.env.get('GEMINI_API_KEY'),
        source: data ? 'database' : Deno.env.get('GEMINI_API_KEY') ? 'env' : null,
        last4: data?.last4 ?? null,
        updatedAt: data?.updated_at ?? null,
      });
    }

    if (action === 'set') {
      const key = String((body as { apiKey?: string }).apiKey || '').trim();
      if (key.length < 20 || key.length > 512) {
        return json({ error: 'Clé invalide (20 à 512 caractères).' }, 400);
      }
      const model = String((body as { model?: string }).model || 'google/gemini-2.5-flash');
      const check = await probe(model, key);
      if (!check.ok) return json({ error: check.message }, 400);

      const { error } = await admin.from('payment_gateway_secrets').upsert(
        {
          gateway: ROW,
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

    if (action === 'delete') {
      const { error } = await admin.from('payment_gateway_secrets').delete().eq('gateway', ROW);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === 'test') {
      const model = String((body as { model?: string }).model || '').trim();
      if (!model) return json({ error: 'Modèle requis.' }, 400);
      const provided = String((body as { apiKey?: string }).apiKey || '').trim();
      const key = provided || (await readKey());
      const check = await probe(model, key);
      return json(check.ok ? { ok: true, message: check.message, via: check.via } : { error: check.message }, check.ok ? 200 : 400);
    }

    return json({ error: 'Action inconnue' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 500);
  }
});
