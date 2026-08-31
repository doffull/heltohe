import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendMail } from '../_shared/mailer.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Texte libre saisi par l'admin → HTML sûr (gras `**mot**`, sauts de ligne). */
function bodyToHtml(raw: string): string {
  return escapeHtml(raw)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.7;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function shell(inner: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:4px;overflow:hidden;">
<tr><td style="background:#111;padding:28px 32px;text-align:center;">
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">HELVETICA-MP</h1>
  <p style="margin:6px 0 0;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Concept Store</p>
</td></tr>
<tr><td style="padding:36px 32px 8px;">${inner}</td></tr>
<tr><td style="padding:24px 32px 32px;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:12px;color:#aaa;text-align:center;line-height:1.8;">Cet e-mail a été envoyé à <strong>${escapeHtml(email)}</strong>.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Non autorisé' }, 401);

    const sbAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await sbAuth.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Non autorisé' }, 401);

    const { data: isAdmin } = await sbAuth.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Réservé aux administrateurs' }, 403);

    const payload = await req.json().catch(() => null) as
      | { to?: string; subject?: string; message?: string; emailType?: string }
      | null;
    const to = (payload?.to || '').trim();
    const subject = (payload?.subject || '').trim();
    const message = (payload?.message || '').trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ error: 'Adresse e-mail invalide' }, 400);
    if (subject.length < 2 || subject.length > 200) return json({ error: 'Objet requis (2 à 200 caractères)' }, 400);
    if (message.length < 2 || message.length > 10000) return json({ error: 'Message requis (2 à 10000 caractères)' }, 400);

    const emailType = (payload?.emailType || 'admin_manual').slice(0, 40);

    const result = await sendMail({
      to,
      subject,
      html: shell(bodyToHtml(message), to),
    });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    await admin.from('customer_email_log').insert({
      customer_email: to,
      email_type: emailType,
      subject,
      status: result.ok ? 'sent' : 'failed',
      provider_id: result.id ?? null,
      error: result.ok ? null : (result.error || '').slice(0, 500),
    });

    if (!result.ok) {
      return json({ error: result.error || "L'envoi a été refusé", status: result.status }, 502);
    }
    return json({ ok: true, id: result.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[send-customer-email]', msg);
    return json({ error: msg }, 500);
  }
});
