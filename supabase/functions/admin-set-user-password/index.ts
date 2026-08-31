import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendMail } from '../_shared/mailer.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function shell(inner: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:4px;overflow:hidden;">
<tr><td style="background:#111;padding:28px 32px;text-align:center;">
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">HELVETICA-MP</h1>
</td></tr>
<tr><td style="padding:36px 32px 8px;">${inner}</td></tr>
<tr><td style="padding:24px 32px 32px;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">Cet e-mail a été envoyé à <strong>${email}</strong>.</p>
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
    const callerId = userData.user.id;

    const { data: isAdmin } = await sbAuth.rpc('has_role', { _user_id: callerId, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Réservé aux administrateurs' }, 403);

    const payload = await req.json().catch(() => null) as
      | { action?: string; userId?: string; password?: string; redirectTo?: string }
      | null;
    const action = payload?.action || '';
    const userId = (payload?.userId || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: 'Utilisateur invalide' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Un admin ne peut pas modifier le mot de passe d'un autre admin.
    if (userId !== callerId) {
      const { data: targetRoles } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if ((targetRoles || []).some((r: { role: string }) => r.role === 'admin')) {
        return json({ error: "Impossible de modifier le mot de passe d'un autre administrateur." }, 403);
      }
    }

    const { data: target, error: targetErr } = await admin.auth.admin.getUserById(userId);
    if (targetErr || !target?.user?.email) return json({ error: 'Compte introuvable' }, 404);
    const email = target.user.email;

    const logEmail = async (subject: string, status: string, providerId?: string, error?: string) => {
      await admin.from('customer_email_log').insert({
        customer_email: email,
        email_type: 'password',
        subject,
        status,
        provider_id: providerId ?? null,
        error: error ? error.slice(0, 500) : null,
      });
    };

    if (action === 'reset-link') {
      const redirectTo = payload?.redirectTo || undefined;
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (linkErr || !link?.properties?.action_link) {
        return json({ error: linkErr?.message || 'Lien de réinitialisation indisponible' }, 502);
      }
      const url = link.properties.action_link;
      const subject = 'Réinitialisation de votre mot de passe';
      const res = await sendMail({
        to: email,
        subject,
        html: shell(
          `<h2 style="margin:0 0 12px;font-size:20px;color:#111;">Réinitialisation du mot de passe</h2>
           <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.7;">Un administrateur a demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau.</p>
           <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Choisir un mot de passe</a></p>
           <p style="margin:0;color:#999;font-size:12px;line-height:1.6;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
          email,
        ),
      });
      await logEmail(subject, res.ok ? 'sent' : 'failed', res.id, res.error);
      if (!res.ok) return json({ error: res.error || "L'envoi a échoué" }, 502);
      return json({ ok: true, email });
    }

    if (action === 'set-password') {
      const password = payload?.password || '';
      if (password.length < 8 || password.length > 72) {
        return json({ error: 'Le mot de passe doit contenir entre 8 et 72 caractères.' }, 400);
      }
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (updErr) return json({ error: updErr.message }, 400);

      const subject = 'Votre mot de passe a été modifié';
      const res = await sendMail({
        to: email,
        subject,
        html: shell(
          `<h2 style="margin:0 0 12px;font-size:20px;color:#111;">Mot de passe modifié</h2>
           <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.7;">Un administrateur vient de définir un nouveau mot de passe pour votre compte <strong>${email}</strong>.</p>
           <p style="margin:0;color:#999;font-size:12px;line-height:1.6;">Si vous n'êtes pas à l'origine de ce changement, contactez-nous immédiatement.</p>`,
          email,
        ),
      });
      await logEmail(subject, res.ok ? 'sent' : 'failed', res.id, res.error);
      return json({ ok: true, email, notified: res.ok });
    }

    return json({ error: 'Action inconnue' }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin-set-user-password]', msg);
    return json({ error: msg }, 500);
  }
});
