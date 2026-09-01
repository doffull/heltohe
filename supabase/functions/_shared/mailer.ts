/**
 * Expéditeur e-mail centralisé — envoi direct via SMTP (o2switch).
 *
 * Secrets Edge Functions utilisés :
 *   SMTP_HOST   ex. mail.helvetica-mp.com
 *   SMTP_PORT   ex. 465 (SSL implicite, secure: true)
 *   SMTP_USER   ex. shop@helvetica-mp.com
 *   SMTP_PASS   mot de passe du compte e-mail
 *   SMTP_FROM   ex. Helvetica MP <shop@helvetica-mp.com>
 *   ADMIN_EMAIL destinataire des alertes internes
 *
 * MAIL_FROM / MAIL_FROM_NAME / MAIL_REPLY_TO restent acceptés en surcharge.
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const FALLBACK_FROM_NAME = 'HELVETICA-MP';

function env(name: string): string {
  return (Deno.env.get(name) || '').trim();
}

/** Adresse d'expédition nue, sans nom affiché. */
export function mailFromAddress(): string {
  const raw = env('MAIL_FROM') || env('SMTP_FROM') || env('SMTP_USER');
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

/** Nom affiché de l'expéditeur. */
export function mailFromName(): string {
  const explicit = env('MAIL_FROM_NAME');
  if (explicit) return explicit;
  const raw = env('SMTP_FROM');
  const match = raw.match(/^\s*"?([^"<]+?)"?\s*</);
  return (match ? match[1] : FALLBACK_FROM_NAME).trim();
}

/** En-tête `From` complet : `Nom <adresse>`. */
export function mailFrom(): string {
  return `${mailFromName()} <${mailFromAddress()}>`;
}

/** Adresse de réponse. */
export function mailReplyTo(): string {
  return env('MAIL_REPLY_TO') || mailFromAddress();
}

/** Adresse e-mail de l'administrateur (alertes internes). */
export function adminEmailAddress(): string {
  return env('ADMIN_EMAIL') || mailFromAddress();
}

export interface SendMailInput {
  to: string | string[];
  subject: string;
  html: string;
  /** Version texte brut. Fortement recommandée : son absence pénalise la délivrabilité. */
  text?: string;
  /** Surcharge ponctuelle du `From` complet (`Nom <adresse>`). Rare. */
  from?: string;
  /** Surcharge ponctuelle de l'adresse de réponse. Rare. */
  replyTo?: string;
  /** En-têtes additionnels (List-Unsubscribe, etc.). */
  headers?: Record<string, string>;
}

/** Version texte brut dérivée du HTML : évite les e-mails « HTML seul » filtrés en spam. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h1|h2|h3|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
    .trim();
}

export interface SendMailResult {
  ok: boolean;
  /** Identifiant local du message (Message-ID), présent si l'envoi a réussi. */
  id?: string;
  /** 200 en cas de succès, 0 si la connexion/authentification SMTP a échoué. */
  status: number;
  /** Message d'erreur lisible, présent seulement en cas d'échec. */
  error?: string;
}

function missingConfig(): string | null {
  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !env(k));
  return missing.length ? `Configuration SMTP incomplète : ${missing.join(', ')}` : null;
}

/**
 * Envoi via le serveur SMTP configuré (connexion SSL implicite sur le port 465).
 * Ne lève jamais : renvoie toujours un SendMailResult.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const configError = missingConfig();
  if (configError) return { ok: false, status: 0, error: configError };

  const port = Number(env('SMTP_PORT') || '465');
  const client = new SMTPClient({
    connection: {
      hostname: env('SMTP_HOST'),
      port,
      tls: port === 465,
      auth: { username: env('SMTP_USER'), password: env('SMTP_PASS') },
    },
  });

  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const messageId = `<${crypto.randomUUID()}@${mailFromAddress().split('@')[1] || 'localhost'}>`;

  try {
    await client.send({
      from: input.from || mailFrom(),
      to: recipients,
      replyTo: input.replyTo || mailReplyTo(),
      subject: input.subject,
      content: input.text || htmlToText(input.html),
      html: input.html,
      headers: { 'Message-ID': messageId, ...(input.headers || {}) },
    });
    return { ok: true, status: 200, id: messageId };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[mailer] Envoi SMTP impossible : ${error}`);
    return { ok: false, status: 0, error };
  } finally {
    try {
      await client.close();
    } catch {
      // fermeture best-effort
    }
  }
}

/** Traduit un échec SMTP en message actionnable pour l'admin. */
export function explainSendFailure(result: SendMailResult): string {
  const raw = result.error || '';
  if (/Configuration SMTP incomplète/.test(raw)) return raw;
  if (/535|authentication|auth/i.test(raw)) {
    return "Authentification SMTP refusée : vérifiez SMTP_USER et SMTP_PASS (compte e-mail o2switch).";
  }
  if (/connect|dns|timeout|refused/i.test(raw)) {
    return `Connexion au serveur SMTP impossible (${env('SMTP_HOST')}:${env('SMTP_PORT') || '465'}).`;
  }
  return raw || "Envoi e-mail refusé par le serveur SMTP.";
}
