/**
 * Gestion des comptes d'équipe (rôles) réservée aux administrateurs.
 *
 * Actions :
 *   create      → crée le compte (mot de passe optionnel) et attribue le rôle
 *   set_password→ définit / modifie le mot de passe
 *   clear_password → remplace le mot de passe par un secret aléatoire jeté
 *                    (le compte ne peut plus se connecter qu'après un lien de réinitialisation)
 *   send_link   → envoie un lien « définir / changer mon mot de passe »
 *   delete_user → supprime définitivement le compte
 *
 * Le JWT de l'appelant est vérifié en code, puis son rôle admin est contrôlé
 * via la fonction SQL has_role. Aucune de ces actions n'est possible autrement.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendMail, explainSendFailure } from '../_shared/mailer.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ROLES = ['admin', 'stock_manager', 'preparator', 'auditor', 'order_validator'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  stock_manager: 'Responsable stock',
  preparator: 'Préparateur',
  auditor: 'Auditeur',
  order_validator: 'Valideur commandes',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function isEmail(v: unknown): v is string {
  return typeof v === 'string' && /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v.trim());
}

function linkEmail(opts: {
  email: string;
  link: string;
  role?: string;
  isNew: boolean;
  siteUrl: string;
}): { subject: string; html: string; text: string } {
  const roleLine = opts.role
    ? `<p style="margin:0 0 16px;font-size:14px;color:#555;">Rôle attribué : <strong>${ROLE_LABELS[opts.role] || opts.role}</strong></p>`
    : '';
  const intro = opts.isNew
    ? "Un accès à l'espace d'administration HELVETICA-MP a été créé pour vous. Définissez votre mot de passe pour l'activer."
    : 'Vous pouvez définir un nouveau mot de passe pour votre accès HELVETICA-MP.';
  const subject = opts.isNew
    ? 'Activez votre accès HELVETICA-MP'
    : 'Définir un nouveau mot de passe HELVETICA-MP';

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:4px;overflow:hidden;">
<tr><td style="background:#111;padding:28px 32px;text-align:center;">
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">HELVETICA-MP</h1>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="margin:0 0 12px;font-size:18px;color:#111;">${opts.isNew ? 'Votre accès est prêt' : 'Nouveau mot de passe'}</h2>
  <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.7;">${intro}</p>
  ${roleLine}
  <p style="margin:24px 0;text-align:center;">
    <a href="${opts.link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:2px;text-transform:uppercase;border-radius:2px;">Définir mon mot de passe</a>
  </p>
  <p style="margin:0;font-size:12px;color:#888;line-height:1.7;">Ce lien est valable 24 heures et à usage unique. Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br>
  <span style="word-break:break-all;color:#555;">${opts.link}</span></p>
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:12px;color:#aaa;text-align:center;line-height:1.8;">Cet e-mail a été envoyé à <strong>${opts.email}</strong> à la demande d'un administrateur de ${opts.siteUrl}.</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    opts.isNew ? 'Votre accès HELVETICA-MP est prêt' : 'Nouveau mot de passe HELVETICA-MP',
    '',
    intro,
    opts.role ? `Rôle attribué : ${ROLE_LABELS[opts.role] || opts.role}` : '',
    '',
    'Définissez votre mot de passe ici (lien valable 24 h, usage unique) :',
    opts.link,
    '',
    `E-mail envoyé à ${opts.email} à la demande d'un administrateur de ${opts.siteUrl}.`,
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Authentification requise' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: 'Session invalide' }, 401);

    const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    if (roleErr) return json({ error: roleErr.message }, 500);
    if (!isAdmin) return json({ error: 'Accès réservé aux administrateurs' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = typeof body.role === 'string' ? body.role : '';
    const redirectTo = typeof body.redirectTo === 'string' && /^https?:\/\//.test(body.redirectTo)
      ? body.redirectTo
      : `${SUPABASE_URL.replace(/\/$/, '')}/`;
    const siteUrl = (() => {
      try { return new URL(redirectTo).origin; } catch { return 'helvetica-mp.net'; }
    })();

    if (!isEmail(email)) return json({ error: 'Adresse e-mail invalide' }, 400);
    if (role && !ROLES.includes(role)) return json({ error: 'Rôle inconnu' }, 400);
    if (['create', 'set_password'].includes(action) && password && password.length < 8) {
      return json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, 400);
    }

    /** Retrouve l'utilisateur par e-mail (pagination raisonnable). */
    const findUser = async () => {
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw new Error(error.message);
        const hit = data.users.find((u) => (u.email || '').toLowerCase() === email);
        if (hit) return hit;
        if (data.users.length < 200) break;
      }
      return null;
    };

    const sendResetLink = async (isNew: boolean) => {
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      });
      if (error) throw new Error(error.message);
      const link = data.properties?.action_link;
      if (!link) throw new Error("Lien de réinitialisation indisponible");
      const mail = linkEmail({ email, link, role, isNew, siteUrl });
      const res = await sendMail({ to: email, ...mail });
      if (!res.ok) throw new Error(explainSendFailure(res));
      return res.id;
    };

    switch (action) {
      case 'create': {
        const existing = await findUser();
        let userId = existing?.id;

        if (!existing) {
          const { data, error } = await admin.auth.admin.createUser({
            email,
            password: password || crypto.randomUUID() + crypto.randomUUID(),
            email_confirm: true,
          });
          if (error) return json({ error: error.message }, 400);
          userId = data.user!.id;
        } else if (password) {
          const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
          if (error) return json({ error: error.message }, 400);
        }

        if (role) {
          const { error } = await admin.from('user_roles').insert({ user_id: userId, role });
          if (error && !/duplicate/i.test(error.message)) return json({ error: error.message }, 400);
        }

        let mailId: string | undefined;
        let mailError: string | undefined;
        if (body.sendLink !== false) {
          try { mailId = await sendResetLink(!existing); }
          catch (e) { mailError = e instanceof Error ? e.message : String(e); }
        }

        return json({
          ok: true,
          userId,
          created: !existing,
          hasPassword: !!password,
          mailId,
          mailError,
        });
      }

      case 'set_password': {
        if (!password) return json({ error: 'Mot de passe requis' }, 400);
        const u = await findUser();
        if (!u) return json({ error: 'Compte introuvable' }, 404);
        const { error } = await admin.auth.admin.updateUserById(u.id, { password });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, userId: u.id });
      }

      case 'clear_password': {
        const u = await findUser();
        if (!u) return json({ error: 'Compte introuvable' }, 404);
        const { error } = await admin.auth.admin.updateUserById(u.id, {
          password: crypto.randomUUID() + crypto.randomUUID(),
        });
        if (error) return json({ error: error.message }, 400);
        let mailError: string | undefined;
        try { await sendResetLink(false); }
        catch (e) { mailError = e instanceof Error ? e.message : String(e); }
        return json({ ok: true, userId: u.id, mailError });
      }

      case 'send_link': {
        const u = await findUser();
        if (!u) return json({ error: 'Compte introuvable' }, 404);
        try {
          const mailId = await sendResetLink(false);
          return json({ ok: true, mailId });
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : String(e) }, 502);
        }
      }

      case 'delete_user': {
        const u = await findUser();
        if (!u) return json({ error: 'Compte introuvable' }, 404);
        if (u.id === userData.user.id) return json({ error: 'Impossible de supprimer votre propre compte' }, 400);
        const { error } = await admin.auth.admin.deleteUser(u.id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      default:
        return json({ error: 'Action inconnue' }, 400);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[admin-team]', message);
    return json({ error: message }, 500);
  }
});
