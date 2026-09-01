/**
 * Demande publique de réinitialisation de mot de passe.
 *
 * Génère le lien de récupération côté serveur et l'envoie via le SMTP maison
 * (délivrabilité bien meilleure que l'expéditeur par défaut du système d'auth).
 *
 * Réponse toujours neutre : impossible de savoir si l'adresse existe.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendMail, explainSendFailure } from '../_shared/mailer.ts';
import { accessEmail } from '../_shared/access-email.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const GENERIC = {
  ok: true,
  message: "Si un compte existe pour cette adresse, un e-mail vient d'être envoyé.",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isEmail = (v: unknown): v is string =>
  typeof v === 'string' && /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v.trim()) && v.length <= 255;

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    // Anti-robot : champ piège + délai minimal de remplissage.
    if (typeof body.honeypot === 'string' && body.honeypot.trim()) return json(GENERIC);
    if (typeof body.elapsedMs === 'number' && body.elapsedMs < 1500) return json(GENERIC);

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!isEmail(email)) return json({ error: 'Adresse e-mail invalide' }, 400);

    // Origine strictement contrôlée : un lien de récupération ne doit jamais
    // pouvoir être redirigé vers un domaine tiers.
    const allowedOrigin = (raw: unknown): string | null => {
      if (typeof raw !== 'string') return null;
      let host: string;
      let url: URL;
      try { url = new URL(raw); host = url.hostname; } catch { return null; }
      if (!/^https?:$/.test(url.protocol)) return null;
      const ok =
        host === 'helvetica-mp.net' ||
        host.endsWith('.helvetica-mp.net') ||
        host.endsWith('.lovable.app') ||
        host === 'localhost' ||
        host === '127.0.0.1';
      return ok ? url.origin : null;
    };
    const origin = allowedOrigin(body.origin) || 'https://helvetica-mp.net';
    const redirectTo = `${origin}/reset-password`;


    const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Limite : 3 demandes par adresse toutes les 15 minutes.
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await db
      .from('password_reset_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', since);
    if ((count ?? 0) >= 3) {
      return json({
        error: 'Trop de demandes pour cette adresse. Merci de réessayer dans quelques minutes.',
      }, 429);
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    const ipHash = ip ? await hashIp(ip) : null;

    const log = (succeeded: boolean, errorMessage?: string) =>
      db.from('password_reset_attempts')
        .insert({ email, ip_hash: ipHash, succeeded, error_message: errorMessage ?? null })
        .then(() => undefined, () => undefined);

    const { data, error } = await db.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    const link = data?.properties?.action_link;
    if (error || !link) {
      // Compte inexistant ou lien indisponible : réponse neutre.
      await log(false, error?.message || 'Lien indisponible');
      return json(GENERIC);
    }

    const mail = accessEmail({ email, link, kind: 'customer_reset', siteUrl: new URL(origin).host });
    const res = await sendMail({ to: email, ...mail });
    await log(res.ok, res.ok ? undefined : explainSendFailure(res));

    if (!res.ok) {
      console.error('[password-reset-request]', explainSendFailure(res));
      return json({ error: "L'e-mail n'a pas pu être envoyé. Merci de réessayer plus tard." }, 502);
    }

    return json(GENERIC);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[password-reset-request]', message);
    return json({ error: message }, 500);
  }
});
