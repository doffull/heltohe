import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendMail, explainSendFailure, htmlToText } from '../_shared/mailer.ts';

/**
 * Envoi d'un e-mail personnalisé à un client depuis l'espace admin.
 * Réservé aux administrateurs. Envoie via Resend (cf. _shared/mailer.ts).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Remplace les variables `{{cle}}` par leur valeur. */
function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : '',
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: authErr } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const { data: isAdmin } = await userClient.rpc('has_role', {
      _user_id: claims.claims.sub,
      _role: 'admin',
    });
    if (!isAdmin) return json({ error: 'Accès réservé aux administrateurs.' }, 403);

    const body = await req.json().catch(() => ({}));
    const recipients: string[] = (Array.isArray(body.to) ? body.to : [body.to])
      .map((v: unknown) => String(v || '').trim().toLowerCase())
      .filter((v: string) => EMAIL_RE.test(v));
    if (recipients.length === 0) return json({ error: 'Destinataire invalide.' }, 400);
    if (recipients.length > 200) return json({ error: 'Trop de destinataires (max 200).' }, 400);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });

    let subject = String(body.subject || '').slice(0, 200);
    let html = String(body.html || '').slice(0, 100000);

    const templateKey = typeof body.templateKey === 'string' ? body.templateKey : '';
    if (templateKey) {
      const { data: tpl } = await admin
        .from('email_templates')
        .select('subject, html_body, is_active')
        .eq('template_key', templateKey)
        .maybeSingle();
      if (tpl && tpl.is_active !== false) {
        subject = subject || String(tpl.subject || '');
        html = html || String(tpl.html_body || '');
      }
    }

    if (!subject.trim() || !html.trim()) {
      return json({ error: "Objet et contenu de l'e-mail requis." }, 400);
    }

    const variables: Record<string, string> = {};
    if (body.variables && typeof body.variables === 'object') {
      for (const [k, v] of Object.entries(body.variables as Record<string, unknown>)) {
        variables[k] = String(v ?? '').slice(0, 2000);
      }
    }

    const results: { to: string; ok: boolean; error?: string }[] = [];
    for (const to of recipients) {
      const vars = { ...variables, email: to };
      const res = await sendMail({
        to,
        subject: render(subject, vars),
        html: render(html, vars),
        text: htmlToText(render(html, vars)),
      });
      results.push({ to, ok: res.ok, error: res.ok ? undefined : explainSendFailure(res) });

      await admin
        .from('customer_email_log')
        .insert({
          customer_email: to,
          order_id: typeof body.orderId === 'string' ? body.orderId : null,
          email_type: templateKey || 'custom',
          subject: render(subject, vars),
          status: res.ok ? 'sent' : 'failed',
          error: res.ok ? null : explainSendFailure(res),
        } as Record<string, unknown>)

        .then(({ error }) => {
          if (error) console.error('[send-custom-email] log:', error.message);
        });
    }

    const sent = results.filter((r) => r.ok).length;
    return json({ ok: sent > 0, sent, failed: results.length - sent, results }, sent > 0 ? 200 : 502);
  } catch (e) {
    console.error('[send-custom-email]', e);
    return json({ error: e instanceof Error ? e.message : 'Erreur inattendue' }, 500);
  }
});
