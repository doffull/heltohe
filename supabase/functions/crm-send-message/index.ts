import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const conversationId = String(body?.conversation_id || '').trim();
    const content = String(body?.content || '').trim();
    const to = String(body?.to || '').trim().toLowerCase();
    const subject = String(body?.subject || '').trim().slice(0, 200) || 'Message';

    if (!conversationId || !content || !to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return json({ error: 'Paramètres invalides (conversation_id, content, to requis).' }, 400);
    }
    if (content.length > 10000) return json({ error: 'Message trop long (10000 max).' }, 400);

    const { data: config } = await supabase
      .from('messaging_config')
      .select('*')
      .eq('config_key', 'main')
      .maybeSingle();

    const fromEmail = (config?.default_from_email || '').trim();
    const fromName = (config?.default_from_name || 'Support').trim();
    const provider = (config?.provider || 'resend').trim();
    const signature = (config?.signature || '').trim();
    const html = `<div>${content.replace(/\n/g, '<br/>')}${signature ? `<br/><br/>${signature.replace(/\n/g, '<br/>')}` : ''}</div>`;

    let sent = false;
    let warning: string | undefined;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');

    if (!fromEmail) {
      warning = "Adresse d'expédition non configurée : message enregistré sans envoi.";
    } else if (provider === 'brevo' && BREVO_API_KEY && LOVABLE_API_KEY) {
      const res = await fetch('https://connector-gateway.lovable.dev/brevo/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (res.ok) sent = true;
      else warning = `Brevo [${res.status}]: ${await res.text()}`;
    } else if (provider === 'resend' && RESEND_API_KEY && LOVABLE_API_KEY) {
      const res = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': RESEND_API_KEY,
        },
        body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [to], subject, html }),
      });
      if (res.ok) sent = true;
      else warning = `Resend [${res.status}]: ${await res.text()}`;
    } else {
      warning = `Aucune clé API ${provider} configurée : message enregistré sans envoi.`;
    }

    const { error: insertError } = await supabase.from('crm_messages').insert({
      conversation_id: conversationId,
      sender_email: fromEmail || user.email,
      recipient_email: to,
      content,
      direction: 'outbound',
    });
    if (insertError) return json({ error: insertError.message }, 400);

    return json({ sent, warning });
  } catch (e) {
    console.error('crm-send-message error', e);
    return json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, 500);
  }
});
