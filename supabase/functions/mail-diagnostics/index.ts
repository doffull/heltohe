// Diagnostic e-mail (admin) : expéditeur configuré + domaines vérifiés dans Resend.
// Ne renvoie jamais la clé API.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { mailFrom, mailReplyTo } from '../_shared/mailer.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Forbidden' }, 403);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return json({ error: 'Forbidden' }, 403);
    const { data: isAdmin } = await userClient.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Forbidden' }, 403);

    const key = Deno.env.get('RESEND_API_KEY');
    let domains: unknown = 'RESEND_API_KEY absente';
    if (key) {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${key}` },
      });
      const text = await res.text();
      domains = res.ok ? JSON.parse(text) : { status: res.status, body: text };
    }

    return json({
      from: mailFrom(),
      replyTo: mailReplyTo(),
      mailFromConfigured: Boolean((Deno.env.get('MAIL_FROM') || '').trim()),
      domains,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erreur' }, 500);
  }
});
