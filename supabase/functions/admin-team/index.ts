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
import { accessEmail } from '../_shared/access-email.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ROLES = ['admin', 'stock_manager', 'preparator', 'auditor', 'order_validator'];

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
}) {
  return accessEmail({
    email: opts.email,
    link: opts.link,
    role: opts.role,
    kind: opts.isNew ? 'new_access' : 'reset',
    siteUrl: opts.siteUrl,
  });
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
      try { return new URL(redirectTo).origin; } catch { return 'com'; }
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

    /** Génère le lien, tente l'envoi. N'échoue jamais : renvoie le lien + l'erreur d'envoi. */
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
      try {
        const res = await sendMail({ to: email, ...mail });
        if (!res.ok) return { link, mailError: explainSendFailure(res) };
        return { link, mailId: res.id };
      } catch (e) {
        return { link, mailError: e instanceof Error ? e.message : String(e) };
      }
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
        let resetLink: string | undefined;
        if (body.sendLink !== false) {
          try {
            const r = await sendResetLink(!existing);
            mailId = r.mailId; mailError = r.mailError; resetLink = r.link;
          } catch (e) { mailError = e instanceof Error ? e.message : String(e); }
        }

        return json({
          ok: true,
          userId,
          created: !existing,
          hasPassword: !!password,
          mailId,
          mailError,
          resetLink,
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
        let resetLink: string | undefined;
        try {
          const r = await sendResetLink(false);
          mailError = r.mailError; resetLink = r.link;
        } catch (e) { mailError = e instanceof Error ? e.message : String(e); }
        return json({ ok: true, userId: u.id, mailError, resetLink });
      }

      case 'send_link': {
        const u = await findUser();
        if (!u) return json({ error: 'Compte introuvable' }, 404);
        try {
          const r = await sendResetLink(false);
          return json({ ok: true, mailId: r.mailId, mailError: r.mailError, resetLink: r.link });
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : String(e) }, 502);
        }
      }

      // Envoi de contrôle : vérifie la configuration Resend et la délivrabilité
      // du gabarit « accès & mot de passe » sans toucher à un vrai compte.
      case 'test_email': {
        const mail = linkEmail({
          email,
          link: `${siteUrl}/reset-password#test`,
          isNew: false,
          siteUrl,
        });
        const res = await sendMail({ to: email, ...mail });
        if (!res.ok) return json({ ok: false, mailError: explainSendFailure(res) });
        return json({ ok: true, mailId: res.id });
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
